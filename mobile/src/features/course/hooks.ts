import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';

import { courseApi } from './api';

/** `GET /courses/:id` (persisted, staleTime 5 min - PLAN.md §10). */
export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => courseApi.detail(courseId),
    staleTime: STALE_TIME.course,
  });
}

/** `GET /courses/:id/similar` - the "Similar courses" list of the Overview tab. */
export function useSimilarCourses(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courseSimilar(courseId),
    queryFn: () => courseApi.similar(courseId),
    staleTime: STALE_TIME.course,
  });
}

/** `GET /lessons/:id` for the preview player. Idle while `lessonId` is null. */
export function usePreviewLesson(lessonId: string | null) {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId ?? ''),
    queryFn: () => courseApi.lesson(lessonId as string),
    enabled: lessonId !== null,
    staleTime: STALE_TIME.lesson,
  });
}

/**
 * `POST /courses/:id/enroll` (free courses). Refreshes everything that depends on enrollment:
 * the course (button -> "Continue learning", curriculum), My Courses, profile stats and Home.
 */
export function useEnrollFree() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: courseApi.enroll,
    onSettled: (_data, _error, courseId) => {
      const keys: QueryKey[] = [
        queryKeys.course(courseId),
        queryKeys.meCoursesAll(),
        queryKeys.meStats(),
        queryKeys.home(),
      ];
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    },
  });
}
