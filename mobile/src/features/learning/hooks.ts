import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { STRINGS } from '@/constants/strings';
import { getErrorMessage } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, CurriculumSection, LikeResponse, ShareResponse } from '@/types/api';

import { learningApi } from './api';

/** `GET /courses/:id/curriculum` (persisted, staleTime 1 min - PLAN.md §10). */
export function useCurriculum(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courseCurriculum(courseId),
    queryFn: () => learningApi.curriculum(courseId),
    staleTime: STALE_TIME.curriculum,
  });
}

/**
 * `GET /lessons/:id` - never cached: the saved `positionSec` must be fresh every time a lesson is
 * opened, and nothing may refetch it while the video plays (the player reads it once).
 */
export function useLesson(lessonId: string | null) {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId ?? ''),
    queryFn: () => learningApi.lesson(lessonId as string),
    enabled: lessonId !== null,
    staleTime: STALE_TIME.lesson,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** First lesson of the course in curriculum order. */
export function getFirstLessonId(
  sections: readonly CurriculumSection[] | undefined,
): string | null {
  for (const section of sections ?? []) {
    const first = section.lessons[0];
    if (first) return first.id;
  }
  return null;
}

type ActiveLessonInput = {
  /** `?lessonId=` of the route. */
  paramLessonId: string | undefined;
  course: { data: CourseDetail | undefined; isFetching: boolean };
  curriculum: { data: CurriculumSection[] | undefined };
};

/**
 * Which lesson the Learning screen plays (PLAN.md SC-15): the `lessonId` param, else the
 * enrollment's `lastLessonId`, else the first lesson. The initial choice is made once (progress
 * saves refresh the course later and must not switch the video); after that the user picks.
 */
export function useActiveLesson({ paramLessonId, course, curriculum }: ActiveLessonInput) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(paramLessonId ?? null);
  const [seenParam, setSeenParam] = useState(paramLessonId);

  if (paramLessonId !== seenParam) {
    setSeenParam(paramLessonId);
    if (paramLessonId) setActiveLessonId(paramLessonId);
  }

  // Wait for a settled course (not mid-refetch): a stale `lastLessonId` would resume the wrong lesson.
  const isCourseSettled = course.data !== undefined && !course.isFetching;
  const fallbackId = isCourseSettled
    ? (course.data?.enrollment?.lastLessonId ?? getFirstLessonId(curriculum.data))
    : null;
  if (activeLessonId === null && fallbackId !== null) setActiveLessonId(fallbackId);

  return { activeLessonId, selectLesson: setActiveLessonId };
}

function patchCourse(
  queryClient: ReturnType<typeof useQueryClient>,
  courseId: string,
  patch: (course: CourseDetail) => CourseDetail,
): void {
  queryClient.setQueryData<CourseDetail>(queryKeys.course(courseId), (old) =>
    old ? patch(old) : old,
  );
}

type LikeContext = { previous: CourseDetail | undefined };

/** `PUT/DELETE /courses/:id/like` with an optimistic update of the course detail (FR-17). */
export function useToggleCourseLike(courseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<LikeResponse, Error, boolean, LikeContext>({
    // Offline writes must reach `apiClient`, which rejects them with `OFFLINE` (toast below).
    networkMode: 'always',
    mutationFn: (isLiked) => (isLiked ? learningApi.unlike(courseId) : learningApi.like(courseId)),
    onMutate: async (isLiked) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.course(courseId), exact: true });
      const previous = queryClient.getQueryData<CourseDetail>(queryKeys.course(courseId));
      patchCourse(queryClient, courseId, (course) => ({
        ...course,
        isLiked: !isLiked,
        likeCount: Math.max(0, course.likeCount + (isLiked ? -1 : 1)),
      }));
      return { previous };
    },
    onError: (error, _isLiked, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.course(courseId), context.previous);
      }
      toast.error(getErrorMessage(error));
    },
    onSuccess: (data) => {
      patchCourse(queryClient, courseId, (course) => ({
        ...course,
        isLiked: data.isLiked,
        likeCount: data.likeCount,
      }));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    },
  });
}

/**
 * Opens the system share sheet and, when the user really shared, counts it with
 * `POST /courses/:id/share`. A failed count (offline...) is silent: the share itself worked.
 */
export function useShareCourse(courseId: string, title: string | undefined) {
  const queryClient = useQueryClient();
  const countShare = useMutation<ShareResponse, Error, void>({
    networkMode: 'always',
    mutationFn: () => learningApi.share(courseId),
    onSuccess: (data) => {
      patchCourse(queryClient, courseId, (course) => ({ ...course, shareCount: data.shareCount }));
    },
  });

  const share = async () => {
    if (!title) return;
    try {
      const result = await Share.share({ message: `Check out "${title}" on ${STRINGS.appName}` });
      if (result.action === Share.sharedAction) countShare.mutate();
    } catch (error) {
      if (__DEV__) console.warn('Share failed', error);
    }
  };

  return { share, isCounting: countShare.isPending };
}
