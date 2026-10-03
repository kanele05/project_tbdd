import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { ReviewDto, TeacherDetail, TeacherSummary } from '@/types/api';

import { teacherApi } from './api';
import {
  useTeacher,
  useTeacherCourseBookmark,
  useTeacherCourses,
  useTeacherReviews,
  useTeachersInfinite,
} from './hooks';

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

const mockToggleBookmark = jest.fn();
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark }),
}));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));

const api = jest.mocked(teacherApi);

const REVIEW = {
  id: 'r1',
  rating: 5,
  content: 'Nice',
  createdAt: '2026-10-01T00:00:00.000Z',
  user: { id: 'u', fullName: 'U', avatarUrl: null },
} as ReviewDto;

function meta(page: number, totalPages: number) {
  return { page, limit: 20, total: 2, totalPages };
}

afterEach(async () => {
  await act(flushNotifications);
});

describe('teacher query hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useTeacher fetches the detail, but not for an empty id', async () => {
    api.detail.mockResolvedValue({ id: 't1' } as TeacherDetail);
    const wrapper = createQueryWrapper(createTestQueryClient());
    const loaded = await renderHook(() => useTeacher('t1'), { wrapper });
    const empty = await renderHook(() => useTeacher(''), { wrapper });

    await waitFor(() => expect(loaded.result.current.data?.id).toBe('t1'));
    expect(empty.result.current.fetchStatus).toBe('idle');
    expect(api.detail).toHaveBeenCalledTimes(1);
  });

  it('useTeacherCourses waits until the tab is opened', async () => {
    api.courses.mockResolvedValue([]);
    const wrapper = createQueryWrapper(createTestQueryClient());
    const { result, rerender } = await renderHook(
      (props: { isEnabled: boolean }) => useTeacherCourses('t1', props.isEnabled),
      { wrapper, initialProps: { isEnabled: false } },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.courses).not.toHaveBeenCalled();

    await rerender({ isEnabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.courses).toHaveBeenCalledWith('t1');
  });

  it('useTeacherReviews pages through the reviews', async () => {
    api.reviews
      .mockResolvedValueOnce({ data: [REVIEW], meta: meta(1, 2) })
      .mockResolvedValueOnce({ data: [{ ...REVIEW, id: 'r2' }], meta: meta(2, 2) });
    const { result } = await renderHook(() => useTeacherReviews('t1'), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(api.reviews).toHaveBeenNthCalledWith(2, 't1', { page: 2 });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('useTeachersInfinite loads the top teachers page by page', async () => {
    api.list.mockResolvedValue({ data: [{ id: 't1' } as TeacherSummary], meta: meta(1, 1) });
    const { result } = await renderHook(() => useTeachersInfinite(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.data?.pages[0]?.data[0]?.id).toBe('t1'));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useTeacherCourseBookmark', () => {
  it('toggles the bookmark using the course current state', async () => {
    const course = makeCourse({ id: 'c9', isBookmarked: true });
    const { result } = await renderHook(() => useTeacherCourseBookmark());

    result.current(course);

    expect(mockToggleBookmark).toHaveBeenCalledWith('c9', true, course);
  });
});
