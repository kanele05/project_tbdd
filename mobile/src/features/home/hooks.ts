import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { courseApi } from '@/features/course/api';
import { queryKeys } from '@/lib/queryKeys';

import { homeApi } from './api';

/**
 * `GET /home` - persisted (opens instantly from cache, then refreshes in the background),
 * staleTime 5 min. Shared by Home (SC-04) and the "Recommended for you" list of Search (SC-05).
 */
export function useHome() {
  return useQuery({
    queryKey: queryKeys.home(),
    queryFn: homeApi.get,
    staleTime: STALE_TIME.home,
  });
}

/**
 * `GET /courses/:id` for the course shown in the desktop billboard (description + the lesson that
 * can be previewed). Shares the course-detail cache entry, so opening "Details" is instant.
 * Idle while `courseId` is null (the banner points to a category).
 */
export function useBillboardCourse(courseId: string | null) {
  return useQuery({
    queryKey: queryKeys.course(courseId ?? ''),
    queryFn: () => courseApi.detail(courseId as string),
    staleTime: STALE_TIME.course,
    enabled: courseId !== null,
  });
}
