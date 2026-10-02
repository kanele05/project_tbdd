import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { makeCourse } from '@/components/course/courseFixtures';
import { showToast } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, FollowResponse, TeacherDetail } from '@/types/api';

import { teacherApi } from './api';
import { useTeacherCourses, useTeachersInfinite, useToggleFollow } from './hooks';

jest.mock('./api', () => ({
  teacherApi: {
    list: jest.fn(),
    detail: jest.fn(),
    courses: jest.fn(),
    reviews: jest.fn(),
    follow: jest.fn(),
    unfollow: jest.fn(),
  },
}));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));

const api = jest.mocked(teacherApi);

const TEACHER: TeacherDetail = {
  id: 't1',
  fullName: 'Sara Weise',
  avatarUrl: null,
  organization: null,
  ratingAvg: 4.5,
  ratingCount: 10,
  jobTitle: 'UI/UX Designer',
  bio: 'Bio',
  coverUrl: null,
  location: 'New York',
  timezone: 'America/New_York',
  isFollowed: false,
  stats: { courseCount: 3, studentCount: 100, followerCount: 10 },
};

const COURSE_DETAIL = {
  ...makeCourse({ id: 'c1', teacher: { id: 't1', fullName: 'Sara Weise' } }),
  teacher: { id: 't1', fullName: 'Sara Weise', avatarUrl: null, jobTitle: 'D', isFollowed: false },
} as CourseDetail;

const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(queryClient);
  queryClient.setQueryData(queryKeys.teacher('t1'), TEACHER);
  queryClient.setQueryData(queryKeys.course('c1'), COURSE_DETAIL);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const getTeacher = (client: QueryClient) =>
  client.getQueryData<TeacherDetail>(queryKeys.teacher('t1'));
const getCourse = (client: QueryClient) =>
  client.getQueryData<CourseDetail>(queryKeys.course('c1'));

describe('useToggleFollow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    clients.forEach((client) => client.clear());
    clients.length = 0;
  });

  it('follows optimistically in the teacher and course caches, then trusts the server numbers', async () => {
    const { queryClient, wrapper } = setup();
    let resolveFollow: (value: FollowResponse) => void = () => undefined;
    api.follow.mockReturnValue(new Promise((resolve) => (resolveFollow = resolve)));
    const { result } = await renderHook(() => useToggleFollow(), { wrapper });

    await act(async () => result.current.toggleFollow('t1', false));

    // Optimistic state is visible before the request finishes.
    await waitFor(() => expect(getTeacher(queryClient)?.isFollowed).toBe(true));
    expect(getTeacher(queryClient)?.stats.followerCount).toBe(11);
    expect(getCourse(queryClient)?.teacher.isFollowed).toBe(true);
    expect(api.follow).toHaveBeenCalledWith('t1');
    expect(api.unfollow).not.toHaveBeenCalled();

    await act(async () => resolveFollow({ isFollowed: true, followerCount: 25 }));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(getTeacher(queryClient)?.stats.followerCount).toBe(25);
  });

  it('unfollows (DELETE) when the teacher is currently followed', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.teacher('t1'), { ...TEACHER, isFollowed: true });
    api.unfollow.mockResolvedValue({ isFollowed: false, followerCount: 9 });
    const { result } = await renderHook(() => useToggleFollow(), { wrapper });

    await act(async () => result.current.toggleFollow('t1', true));

    await waitFor(() => expect(api.unfollow).toHaveBeenCalledWith('t1'));
    expect(api.follow).not.toHaveBeenCalled();
    await waitFor(() => expect(getTeacher(queryClient)?.isFollowed).toBe(false));
  });

  it('rolls back and shows a toast when the server refuses (422 CANNOT_FOLLOW_SELF)', async () => {
    const { queryClient, wrapper } = setup();
    api.follow.mockRejectedValue(
      new AppError({ status: 422, code: 'CANNOT_FOLLOW_SELF', message: 'nope' }),
    );
    const { result } = await renderHook(() => useToggleFollow(), { wrapper });

    await act(async () => result.current.toggleFollow('t1', false));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("You can't follow yourself.", { type: 'error' }),
    );
    expect(getTeacher(queryClient)?.isFollowed).toBe(false);
    expect(getTeacher(queryClient)?.stats.followerCount).toBe(10);
    expect(getCourse(queryClient)?.teacher.isFollowed).toBe(false);
  });
});

describe('teacher query hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    clients.forEach((client) => client.clear());
    clients.length = 0;
  });

  it('does not fetch the courses until the tab enables it', async () => {
    const { wrapper } = setup();
    api.courses.mockResolvedValue([]);

    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useTeacherCourses('t1', enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(api.courses).not.toHaveBeenCalled();

    await rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.courses).toHaveBeenCalledWith('t1');
  });

  it('requests the next page of top teachers until the last page', async () => {
    const { wrapper } = setup();
    const meta = { limit: 20, total: 2 };
    api.list
      .mockResolvedValueOnce({ data: [], meta: { ...meta, page: 1, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [], meta: { ...meta, page: 2, totalPages: 2 } });

    const { result } = await renderHook(() => useTeachersInfinite(), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(api.list).toHaveBeenLastCalledWith({ page: 2 });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
});
