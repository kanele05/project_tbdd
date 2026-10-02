import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  type InfiniteData,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { makeCourse } from '@/components/course/courseFixtures';
import { showToast } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, CourseSummary, HomeResponse, MeStatsDto, Paginated } from '@/types/api';

import { bookmarkApi } from './api';
import { useToggleBookmark } from './hooks';

jest.mock('./api', () => ({
  bookmarkApi: { add: jest.fn(), remove: jest.fn() },
}));

jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));

const mockAdd = bookmarkApi.add as jest.Mock;
const mockRemove = bookmarkApi.remove as jest.Mock;
const mockShowToast = showToast as jest.Mock;

type BookmarksData = InfiniteData<Paginated<CourseSummary>>;

const meta = { page: 1, limit: 20, totalPages: 1 };

function makeHome(course: CourseSummary): HomeResponse {
  return {
    banners: [],
    categories: [],
    popular: [course, makeCourse({ id: 'other' })],
    recommended: [course],
    inspires: [],
    topTeachers: [],
  };
}

function makeBookmarks(courses: CourseSummary[]): BookmarksData {
  return {
    pages: [{ data: courses, meta: { ...meta, total: courses.length } }],
    pageParams: [1],
  };
}

const clients: QueryClient[] = [];

function createClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: 0 } },
  });
  clients.push(client);
  return client;
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const pendingResolvers: (() => void)[] = [];

/** A request that stays in flight until the test ends (resolved in `afterEach`). */
function pendingRequest(): Promise<void> {
  return new Promise<void>((resolve) => pendingResolvers.push(resolve));
}

const unmounts: (() => Promise<void> | void)[] = [];

async function setup(client: QueryClient) {
  const rendered = await renderHook(() => useToggleBookmark(), {
    wrapper: createWrapper(client),
  });
  unmounts.push(rendered.unmount);
  return rendered;
}

describe('useToggleBookmark', () => {
  afterEach(async () => {
    pendingResolvers.splice(0).forEach((resolve) => resolve());
    for (const unmount of unmounts.splice(0)) await unmount();
    // Clearing the caches drops the mutation gc timers so Jest can exit.
    clients.splice(0).forEach((client) => client.clear());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  it('flips isBookmarked in home, course lists, detail and similar caches before the request ends', async () => {
    const client = createClient();
    const course = makeCourse({ id: 'c1', isBookmarked: false });
    let resolveRequest: () => void = () => undefined;
    mockAdd.mockReturnValue(new Promise<void>((resolve) => (resolveRequest = resolve)));

    client.setQueryData(queryKeys.home(), makeHome(course));
    client.setQueryData<InfiniteData<Paginated<CourseSummary>>>(
      queryKeys.coursesList({ q: 'design' }),
      makeBookmarks([course]),
    );
    client.setQueryData(queryKeys.course('c1'), { ...course, description: 'x' } as CourseDetail);
    client.setQueryData(queryKeys.courseSimilar('other-host'), [course]);

    const { result } = await setup(client);
    await act(async () => {
      result.current.toggleBookmark('c1', false);
    });

    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith('c1'));
    const home = client.getQueryData<HomeResponse>(queryKeys.home());
    expect(home?.popular[0]?.isBookmarked).toBe(true);
    expect(home?.popular[1]?.isBookmarked).toBe(false); // other course untouched
    expect(home?.recommended[0]?.isBookmarked).toBe(true);
    const list = client.getQueryData<BookmarksData>(queryKeys.coursesList({ q: 'design' }));
    expect(list?.pages[0]?.data[0]?.isBookmarked).toBe(true);
    expect(client.getQueryData<CourseDetail>(queryKeys.course('c1'))?.isBookmarked).toBe(true);
    expect(
      client.getQueryData<CourseSummary[]>(queryKeys.courseSimilar('other-host'))?.[0]
        ?.isBookmarked,
    ).toBe(true);
    expect(result.current.isPending).toBe(true);

    await act(async () => resolveRequest());
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('removes the course from the Saved list and lowers savedCount when un-saving', async () => {
    const client = createClient();
    const course = makeCourse({ id: 'c1', isBookmarked: true });
    client.setQueryData(
      queryKeys.meBookmarks(),
      makeBookmarks([course, makeCourse({ id: 'c2', isBookmarked: true })]),
    );
    client.setQueryData<MeStatsDto>(queryKeys.meStats(), {
      savedCount: 2,
      ongoingCount: 1,
      completedCount: 0,
    });
    mockRemove.mockReturnValue(pendingRequest());

    const { result } = await setup(client);
    await act(async () => {
      result.current.toggleBookmark('c1', true);
    });

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('c1'));
    const saved = client.getQueryData<BookmarksData>(queryKeys.meBookmarks());
    expect(saved?.pages[0]?.data.map((item) => item.id)).toEqual(['c2']);
    expect(saved?.pages[0]?.meta.total).toBe(1);
    expect(client.getQueryData<MeStatsDto>(queryKeys.meStats())?.savedCount).toBe(1);
  });

  it('inserts a saved course into the Saved list using the given course (Undo)', async () => {
    const client = createClient();
    const kept = makeCourse({ id: 'c2', isBookmarked: true });
    const undone = makeCourse({ id: 'c1', isBookmarked: false });
    client.setQueryData(queryKeys.meBookmarks(), makeBookmarks([kept]));
    mockAdd.mockReturnValue(pendingRequest());

    const { result } = await setup(client);
    await act(async () => {
      result.current.toggleBookmark('c1', false, undone);
    });

    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith('c1'));
    const saved = client.getQueryData<BookmarksData>(queryKeys.meBookmarks());
    expect(saved?.pages[0]?.data.map((item) => [item.id, item.isBookmarked])).toEqual([
      ['c1', true],
      ['c2', true],
    ]);
  });

  it('rolls everything back and shows a toast when the request fails', async () => {
    const client = createClient();
    const course = makeCourse({ id: 'c1', isBookmarked: true });
    client.setQueryData(queryKeys.home(), makeHome(course));
    client.setQueryData(queryKeys.meBookmarks(), makeBookmarks([course]));
    client.setQueryData<MeStatsDto>(queryKeys.meStats(), {
      savedCount: 1,
      ongoingCount: 0,
      completedCount: 0,
    });
    mockRemove.mockRejectedValue(
      new AppError({ status: 0, code: 'OFFLINE', message: "You're offline" }),
    );

    const { result } = await setup(client);
    await act(async () => {
      result.current.toggleBookmark('c1', true);
    });

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
    expect(mockShowToast).toHaveBeenCalledWith("You're offline", { type: 'error' });
    expect(client.getQueryData<HomeResponse>(queryKeys.home())?.popular[0]?.isBookmarked).toBe(
      true,
    );
    expect(
      client.getQueryData<BookmarksData>(queryKeys.meBookmarks())?.pages[0]?.data,
    ).toHaveLength(1);
    expect(client.getQueryData<MeStatsDto>(queryKeys.meStats())?.savedCount).toBe(1);
  });

  it('refreshes stats and the Saved list after the request settles', async () => {
    const client = createClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const { result } = await setup(client);
    await act(async () => {
      result.current.toggleBookmark('c1', false);
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.meStats() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.meBookmarks() });
  });

  it('blocks the write, keeps the cache untouched and shows a toast while offline', async () => {
    const client = createClient();
    const course = makeCourse({ id: 'c1', isBookmarked: false });
    client.setQueryData(queryKeys.home(), makeHome(course));
    onlineManager.setOnline(false);

    try {
      const { result } = await setup(client);
      await act(async () => {
        result.current.toggleBookmark('c1', false);
      });

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith("You're offline", { type: 'error' }),
      );
      expect(mockAdd).not.toHaveBeenCalled();
      expect(client.getQueryData<HomeResponse>(queryKeys.home())?.popular[0]?.isBookmarked).toBe(
        false,
      );
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('keeps a stable toggleBookmark function across renders', async () => {
    const client = createClient();
    const { result, rerender } = await setup(client);
    const first = result.current.toggleBookmark;
    await rerender(undefined);
    expect(result.current.toggleBookmark).toBe(first);
  });
});
