import { onlineManager, type QueryClient } from '@tanstack/react-query';

import { queryClient as appQueryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';

import { learningApi } from './api';
import { flushPendingProgress, type FlushResult } from './progressQueue';

/**
 * A lesson was completed (or the course progress changed): refresh everything that shows it.
 * PLAN.md §10: curriculum (✓ icon), My Courses (%), and - when the whole course is done - the
 * profile stats, the course detail (enrollment) and the notifications (`COURSE_COMPLETED`).
 */
export function invalidateAfterProgress(
  queryClient: QueryClient,
  courseId: string,
  courseProgressPercent: number,
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.courseCurriculum(courseId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.meCoursesAll() });
  if (courseProgressPercent >= 100) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meStats() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
  }
}

/** Send the progress that was queued while offline and refresh the affected screens. */
export function syncPendingProgress(): Promise<FlushResult> {
  return flushPendingProgress({
    userId: useAuthStore.getState().user?.id ?? null,
    send: learningApi.saveProgress,
    onSent: (entry, response) => {
      invalidateAfterProgress(appQueryClient, entry.courseId, response.courseProgressPercent);
    },
  });
}

let unsubscribe: (() => void) | null = null;

/**
 * Start the background sync (idempotent): flush once now if online, and again every time the
 * network comes back (`onlineManager` is wired to NetInfo in `setupQueryEnvironment`).
 * Called by the screens that produce or display progress (Learning, My Courses); the
 * subscription then lives for the rest of the session.
 */
export function startPendingProgressSync(): void {
  if (unsubscribe) return;
  unsubscribe = onlineManager.subscribe((isOnline) => {
    if (isOnline) void syncPendingProgress();
  });
  if (onlineManager.isOnline()) void syncPendingProgress();
}

export function stopPendingProgressSync(): void {
  unsubscribe?.();
  unsubscribe = null;
}
