import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import type { LessonDetail } from '@/types/api';

import { learningApi } from './api';
import { invalidateAfterProgress, startPendingProgressSync } from './progressSync';
import { LessonProgressTracker } from './progressTracker';

/**
 * Wires a `LessonProgressTracker` to the lifecycle of the lesson on screen (PLAN.md FR-16):
 * it saves when the app goes to the background and when the player unmounts (leaving the screen
 * or switching lesson), refreshes the ✓ icon / course % when the lesson gets completed, and
 * makes sure the offline queue is synced. The player feeds it with `update` / `markEnded`.
 */
export function useLessonProgress(
  lesson: Pick<LessonDetail, 'id' | 'durationSec' | 'isCompleted'>,
  courseId: string,
): LessonProgressTracker {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? '');

  const [tracker] = useState(() => {
    let isCompletionAnnounced = lesson.isCompleted;
    return new LessonProgressTracker({
      lessonId: lesson.id,
      courseId,
      userId,
      durationSec: lesson.durationSec,
      isInitiallyCompleted: lesson.isCompleted,
      send: learningApi.saveProgress,
      onSaved: (response) => {
        if (response.lessonProgress.isCompleted && !isCompletionAnnounced) {
          isCompletionAnnounced = true;
          invalidateAfterProgress(queryClient, courseId, response.courseProgressPercent);
        }
      },
    });
  });

  useEffect(() => {
    startPendingProgressSync();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') void tracker.flush();
    });
    return () => {
      subscription.remove();
      // Unmount = leaving the screen or switching lesson: save, then refresh `lastLessonId`.
      void tracker.flush().then(() => {
        if (!tracker.hasReported) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
        void queryClient.invalidateQueries({ queryKey: queryKeys.meCoursesAll() });
      });
    };
  }, [tracker, queryClient, courseId]);

  return tracker;
}
