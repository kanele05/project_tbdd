import { act, renderHook, waitFor } from '@testing-library/react-native';

import { isPersistedQueryKey, queryKeys } from '@/lib/queryKeys';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { AdminUsersPage } from '@/types/api';

import { adminApi } from './api';
import {
  useAdminAiReview,
  useAdminCourses,
  useAdminUsers,
  useApproveCourse,
  useDisableUser,
} from './hooks';
import { makeAiReview, makeDetail, makeQueueItem, makeUser } from './testFixtures';

jest.mock('./api', () => ({
  adminApi: {
    stats: jest.fn(),
    courses: jest.fn(),
    course: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    aiReview: jest.fn(),
    users: jest.fn(),
    disableUser: jest.fn(),
    enableUser: jest.fn(),
  },
}));

const api = jest.mocked(adminApi);

afterEach(async () => {
  await act(flushNotifications);
});

describe('admin query keys', () => {
  it('keeps the AI review apart from the course detail and never persists admin data', () => {
    expect(queryKeys.adminCourse('c1')).toEqual(['admin', 'course', 'c1']);
    expect(isPersistedQueryKey(queryKeys.adminStats())).toBe(false);
    expect(isPersistedQueryKey(queryKeys.adminUsers({}))).toBe(false);
    expect(queryKeys.adminAiReview('c1', 'vi')).toEqual(['admin', 'ai-review', 'c1', 'vi']);
    expect(queryKeys.adminCourses({ type: 'revision' })).toEqual([
      'admin',
      'courses',
      { type: 'revision' },
    ]);
  });
});

describe('useAdminCourses', () => {
  it('loads the next page until the last one', async () => {
    api.courses
      .mockResolvedValueOnce({
        data: [makeQueueItem({ id: 'a' })],
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 2,
          pending: { courses: 2, revisions: 0 },
        },
      })
      .mockResolvedValueOnce({
        data: [makeQueueItem({ id: 'b' })],
        meta: {
          page: 2,
          limit: 20,
          total: 2,
          totalPages: 2,
          pending: { courses: 2, revisions: 0 },
        },
      });
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useAdminCourses({ type: 'course' }), {
      wrapper: createQueryWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(api.courses).toHaveBeenLastCalledWith({ type: 'course', page: 2 });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.pages).toHaveLength(2);
  });
});

describe('useAdminAiReview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not call the AI until it is enabled', async () => {
    api.aiReview.mockResolvedValue(makeAiReview());
    const client = createTestQueryClient();
    const wrapper = createQueryWrapper(client);
    const { result, rerender } = await renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useAdminAiReview('c1', 'en', isEnabled),
      { wrapper, initialProps: { isEnabled: false } },
    );
    expect(api.aiReview).not.toHaveBeenCalled();

    await rerender({ isEnabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.aiReview).toHaveBeenCalledWith('c1', 'en');
  });
});

describe('useApproveCourse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the returned detail and refreshes the queue and stats', async () => {
    const approved = makeDetail({ status: 'PUBLISHED', reviewTarget: null });
    api.approve.mockResolvedValue(approved);
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useApproveCourse('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(client.getQueryData(queryKeys.adminCourse('c1'))).toEqual(approved);
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([queryKeys.adminStats(), queryKeys.adminCoursesAll()]),
    );
  });
});

describe('useDisableUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('swaps the updated user into the cached list', async () => {
    const original = makeUser();
    const disabled = makeUser({ disabledAt: '2026-10-11T00:00:00.000Z', disabledReason: 'Spam' });
    // The refetch that follows the mutation never answers, so the cache shows the in-place swap.
    api.users
      .mockResolvedValueOnce({
        data: [original],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockImplementation(() => new Promise(() => undefined));
    api.disableUser.mockResolvedValue(disabled);
    const client = createTestQueryClient();
    const wrapper = createQueryWrapper(client);
    const list = await renderHook(() => useAdminUsers({}), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const action = await renderHook(() => useDisableUser(), { wrapper });

    await act(async () => {
      await action.result.current.mutateAsync({ userId: 'u1', reason: 'Spam' });
    });

    expect(api.disableUser).toHaveBeenCalledWith('u1', { reason: 'Spam' });
    const cached = client.getQueryData<{ pages: AdminUsersPage[] }>(queryKeys.adminUsers({}));
    expect(cached?.pages[0]?.data[0]?.disabledAt).toBe('2026-10-11T00:00:00.000Z');
  });
});
