import { act, renderHook, waitFor } from '@testing-library/react-native';

import { queryKeys } from '@/lib/queryKeys';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { MyCourseItem } from '@/types/api';

import { myCoursesApi } from './api';
import { useMyCourses } from './hooks';

jest.mock('./api', () => ({ myCoursesApi: { list: jest.fn() } }));

const mocked = myCoursesApi as jest.Mocked<typeof myCoursesApi>;

const ITEM: MyCourseItem = {
  course: { id: 'c1', title: 'PHP', thumbnailUrl: 'https://example.com/a.png' },
  totalDurationSec: 600,
  progressPercent: 40,
  lastLessonId: 'l1',
  lastAccessedAt: '2026-10-01T00:00:00.000Z',
};

afterEach(async () => {
  await act(flushNotifications);
});

describe('useMyCourses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the courses of the selected status', async () => {
    mocked.list.mockResolvedValue([ITEM]);
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMyCourses('ongoing'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual([ITEM]));
    expect(mocked.list).toHaveBeenCalledWith('ongoing');
    expect(client.getQueryData(queryKeys.meCourses('ongoing'))).toEqual([ITEM]);
  });

  it('treats data as stale immediately (staleTime 0) so a finished lesson shows new progress', async () => {
    mocked.list.mockResolvedValue([ITEM]);
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMyCourses('all'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(true);
  });

  it('keeps one cache entry per status', async () => {
    mocked.list.mockResolvedValue([ITEM]);
    const client = createTestQueryClient();
    const wrapper = createQueryWrapper(client);
    const first = await renderHook(() => useMyCourses('all'), { wrapper });
    const second = await renderHook(() => useMyCourses('completed'), { wrapper });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(mocked.list).toHaveBeenCalledTimes(2);
  });
});
