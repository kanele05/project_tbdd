import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { showToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { getErrorMessage, type AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseSummary, FollowResponse, PaginationMeta } from '@/types/api';

import { teacherApi } from './api';
import {
  invalidateFollowCaches,
  patchFollowInCaches,
  restoreSnapshot,
  type CacheSnapshot,
} from './cacheSync';

/** Next page number for `useInfiniteQuery`, or `undefined` after the last page. */
function getNextPage(lastPage: { meta: PaginationMeta }): number | undefined {
  const { page, totalPages } = lastPage.meta;
  return page < totalPages ? page + 1 : undefined;
}

/** `GET /teachers/:id` (SC-18 header + Overview). */
export function useTeacher(teacherId: string) {
  return useQuery({
    queryKey: queryKeys.teacher(teacherId),
    queryFn: () => teacherApi.detail(teacherId),
    staleTime: STALE_TIME.teacher,
    enabled: Boolean(teacherId),
  });
}

/** `GET /teachers/:id/courses` (SC-18 Courses tab). Pass `enabled=false` until the tab opens. */
export function useTeacherCourses(teacherId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teacherCourses(teacherId),
    queryFn: () => teacherApi.courses(teacherId),
    staleTime: STALE_TIME.teacher,
    enabled: enabled && Boolean(teacherId),
  });
}

/** `GET /teachers/:id/reviews` (SC-18 Review tab), infinite. */
export function useTeacherReviews(teacherId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.teacherReviews(teacherId),
    queryFn: ({ pageParam }) => teacherApi.reviews(teacherId, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    staleTime: STALE_TIME.teacher,
    enabled: enabled && Boolean(teacherId),
  });
}

/** `GET /teachers?sort=top` (SC-19 Top teachers), infinite. */
export function useTeachersInfinite() {
  return useInfiniteQuery({
    queryKey: queryKeys.teachersList(),
    queryFn: ({ pageParam }) => teacherApi.list({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    staleTime: STALE_TIME.teacher,
  });
}

export type UseToggleFollowResult = {
  /**
   * Optimistic follow/unfollow. `isFollowed` is the CURRENT state: `true` sends
   * `DELETE /teachers/:id/follow`, `false` sends `PUT`. Updates the teacher detail and every
   * cached course detail of that teacher, rolls back + toasts on error (BR-14, FR-20).
   */
  toggleFollow: (teacherId: string, isFollowed: boolean) => void;
  isPending: boolean;
};

type FollowVariables = { teacherId: string; isFollowed: boolean };
type FollowContext = { snapshot: CacheSnapshot };

/** Follow / unfollow a teacher with an optimistic update (SC-09 Overview and SC-18). */
export function useToggleFollow(): UseToggleFollowResult {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation<
    FollowResponse,
    AppError,
    FollowVariables,
    FollowContext
  >({
    mutationFn: ({ teacherId, isFollowed }) =>
      isFollowed ? teacherApi.unfollow(teacherId) : teacherApi.follow(teacherId),
    onMutate: async ({ teacherId, isFollowed }) => {
      // A refetch finishing now would overwrite the optimistic value with stale data.
      await queryClient.cancelQueries({ queryKey: queryKeys.teacher(teacherId), exact: true });
      const snapshot = patchFollowInCaches(queryClient, teacherId, { isFollowed: !isFollowed });
      return { snapshot };
    },
    onSuccess: (result, { teacherId }) => {
      // Trust the server's numbers (the response is empty only for a misbehaving server).
      if (result) patchFollowInCaches(queryClient, teacherId, result);
    },
    onError: (error, _variables, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshot);
      showToast(getErrorMessage(error), { type: 'error' });
    },
    onSettled: (_data, _error, { teacherId }) => {
      invalidateFollowCaches(queryClient, teacherId);
    },
  });

  const toggleFollow = useCallback(
    (teacherId: string, isFollowed: boolean) => mutate({ teacherId, isFollowed }),
    [mutate],
  );

  return { toggleFollow, isPending };
}

/**
 * Bookmark handler for the course cards of SC-18 Courses. The shared bookmark hook (owner B)
 * already updates the teacher courses cache, rolls back and toasts on error.
 */
export function useTeacherCourseBookmark(): (course: CourseSummary) => void {
  const { toggleBookmark } = useToggleBookmark();
  return useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked, course),
    [toggleBookmark],
  );
}
