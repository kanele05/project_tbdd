import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { CourseDetail } from '@/types/api';

import { learningApi } from './api';
import { getFirstLessonId, useToggleCourseLike } from './hooks';

const COURSE = { id: 'course-1', isLiked: false, likeCount: 10, shareCount: 2 } as CourseDetail;

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.course('course-1'), COURSE);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  const readCourse = () => queryClient.getQueryData<CourseDetail>(queryKeys.course('course-1'));
  return { wrapper, readCourse };
}

describe('useToggleCourseLike', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
  });

  it('flips the like and the count right away, then keeps the server answer', async () => {
    jest.spyOn(learningApi, 'like').mockResolvedValue({ likeCount: 11, isLiked: true });
    const { wrapper, readCourse } = setup();
    const { result } = await renderHook(() => useToggleCourseLike('course-1'), { wrapper });

    await act(async () => {
      result.current.mutate(false);
    });

    await waitFor(() => expect(readCourse()).toMatchObject({ isLiked: true, likeCount: 11 }));
  });

  it('unlikes with DELETE', async () => {
    const unlike = jest
      .spyOn(learningApi, 'unlike')
      .mockResolvedValue({ likeCount: 9, isLiked: false });
    const { wrapper, readCourse } = setup();
    const { result } = await renderHook(() => useToggleCourseLike('course-1'), { wrapper });

    await act(async () => {
      result.current.mutate(true);
    });

    await waitFor(() => expect(unlike).toHaveBeenCalledWith('course-1'));
    await waitFor(() => expect(readCourse()?.likeCount).toBe(9));
  });

  it('is blocked while offline: rolls back and shows the "You\'re offline" toast (M-28)', async () => {
    // The real apiClient rejects writes with `OFFLINE` while `onlineManager` is offline.
    onlineManager.setOnline(false);
    const { wrapper, readCourse } = setup();
    const { result } = await renderHook(() => useToggleCourseLike('course-1'), { wrapper });

    await act(async () => {
      result.current.mutate(false);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readCourse()).toMatchObject({ isLiked: false, likeCount: 10 });
    expect(
      await screen.findByText("You're offline", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});

describe('getFirstLessonId', () => {
  it('returns the first lesson of the first non-empty chapter', () => {
    const lesson = (id: string) => ({
      id,
      number: 1,
      title: id,
      durationSec: 1,
      isPreview: false,
      status: 'UNLOCKED' as const,
    });
    expect(
      getFirstLessonId([
        { id: 's0', title: 'empty', order: 0, lessons: [] },
        { id: 's1', title: 'one', order: 1, lessons: [lesson('a'), lesson('b')] },
      ]),
    ).toBe('a');
    expect(getFirstLessonId([])).toBeNull();
    expect(getFirstLessonId(undefined)).toBeNull();
  });
});
