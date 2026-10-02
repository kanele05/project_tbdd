import { onlineManager } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react-native';

import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import type { UserDto } from '@/types/api';

import { learningApi } from './api';
import { clearPendingProgress, enqueuePendingProgress, getPendingProgress } from './progressQueue';
import {
  invalidateAfterProgress,
  startPendingProgressSync,
  stopPendingProgressSync,
} from './progressSync';

jest.mock('./api', () => ({ learningApi: { saveProgress: jest.fn() } }));

const mockSaveProgress = learningApi.saveProgress as jest.Mock;

const USER = { id: 'user-1', fullName: 'Rosie' } as UserDto;

describe('pending progress sync', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    stopPendingProgressSync();
    await clearPendingProgress();
    useAuthStore.setState({ user: USER });
    onlineManager.setOnline(true);
    mockSaveProgress.mockResolvedValue({
      lessonProgress: { positionSec: 120, isCompleted: false },
      courseProgressPercent: 30,
    });
  });

  afterEach(() => {
    stopPendingProgressSync();
    onlineManager.setOnline(true);
    useAuthStore.setState({ user: null });
  });

  it('flushes the queue by itself when the network comes back', async () => {
    onlineManager.setOnline(false);
    await enqueuePendingProgress({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      userId: USER.id,
      positionSec: 120,
      isCompleted: false,
    });

    startPendingProgressSync();
    expect(mockSaveProgress).not.toHaveBeenCalled();

    onlineManager.setOnline(true);

    await waitFor(() =>
      expect(mockSaveProgress).toHaveBeenCalledWith('lesson-1', { positionSec: 120 }),
    );
    await waitFor(async () => expect(await getPendingProgress()).toEqual([]));
  });

  it('flushes right away when started online with a queued entry', async () => {
    await enqueuePendingProgress({
      lessonId: 'lesson-2',
      courseId: 'course-1',
      userId: USER.id,
      positionSec: 45,
      isCompleted: true,
    });

    startPendingProgressSync();

    await waitFor(() =>
      expect(mockSaveProgress).toHaveBeenCalledWith('lesson-2', {
        positionSec: 45,
        isCompleted: true,
      }),
    );
  });

  it('refreshes the curriculum and My Courses after a queued progress was accepted', async () => {
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await enqueuePendingProgress({
      lessonId: 'lesson-1',
      courseId: 'course-9',
      userId: USER.id,
      positionSec: 10,
      isCompleted: false,
    });

    startPendingProgressSync();

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.courseCurriculum('course-9') }),
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.meCoursesAll() });
    spy.mockRestore();
  });
});

describe('invalidateAfterProgress', () => {
  it('also refreshes stats, course and notifications when the course reaches 100 %', () => {
    const invalidateQueries = jest.fn();
    const client = { invalidateQueries } as unknown as typeof queryClient;

    invalidateAfterProgress(client, 'course-1', 100);

    const keys = invalidateQueries.mock.calls.map(([options]) => options.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.courseCurriculum('course-1'),
        queryKeys.meCoursesAll(),
        queryKeys.meStats(),
        queryKeys.course('course-1'),
        queryKeys.notifications(),
      ]),
    );
  });

  it('only refreshes the curriculum and My Courses for a partial progress', () => {
    const invalidateQueries = jest.fn();
    const client = { invalidateQueries } as unknown as typeof queryClient;

    invalidateAfterProgress(client, 'course-1', 40);

    const keys = invalidateQueries.mock.calls.map(([options]) => options.queryKey);
    expect(keys).toEqual([queryKeys.courseCurriculum('course-1'), queryKeys.meCoursesAll()]);
  });
});
