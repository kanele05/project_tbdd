import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { courseApi } from '@/features/course/api';
import { getNextPageNumber } from '@/features/learning/pages';
import { getErrorMessage } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import type {
  AnswerDto,
  GradeSubmissionRequest,
  ReviewDto,
  ReviewReplyRequest,
  TeacherProfileDto,
  TeacherProfileInput,
  TeacherSubmissionDto,
  TeacherSubmissionsPage,
} from '@/types/api';

import { teachingApi, type SubmissionFilter } from './api';
import {
  isReviewListQuery,
  mapPages,
  patchAnswerPin,
  patchReviewEverywhere,
  restoreQueries,
  snapshotQueries,
  type QuerySnapshot,
} from './cache';

/**
 * `GET /me/teacher-profile` - only fetched for TEACHER accounts. Its `id` equals the
 * `course.teacher.id` of the teacher's own courses, which is how the app knows "this course is mine".
 */
export function useTeacherProfile() {
  const isTeacher = useAuthStore((state) => state.user?.role === 'TEACHER');
  return useQuery({
    queryKey: queryKeys.teachingProfile(),
    queryFn: () => teachingApi.profile(),
    enabled: isTeacher,
    staleTime: STALE_TIME.teacher,
  });
}

/** True when the signed-in teacher owns the courses of the teacher profile `teacherId` (BR-23). */
export function useIsCourseOwner(teacherId: string | undefined): boolean {
  const profile = useTeacherProfile();
  return teacherId !== undefined && profile.data?.id === teacherId;
}

export type CourseTeacherInfo = {
  /** Display name of the course's teacher (for the "Instructor" reply block). */
  teacherName: string | undefined;
  /** The signed-in user is the teacher of this course. */
  isOwner: boolean;
};

/**
 * Teacher of `courseId`, read from the course-detail cache (the screens that need it were opened
 * from the course, so this is usually a cache hit). `courseId` may be missing (deep link).
 */
export function useCourseTeacherInfo(courseId: string | undefined): CourseTeacherInfo {
  const course = useQuery({
    queryKey: queryKeys.course(courseId ?? ''),
    queryFn: () => courseApi.detail(courseId ?? ''),
    enabled: Boolean(courseId),
    staleTime: STALE_TIME.course,
  });
  const teacher = course.data?.teacher;
  const isOwner = useIsCourseOwner(teacher?.id);
  return { teacherName: teacher?.fullName, isOwner };
}

/** `PATCH /me/teacher-profile` (SC-30); refreshes the public teacher page of the same teacher. */
export function useUpdateTeacherProfile() {
  const queryClient = useQueryClient();
  return useMutation<TeacherProfileDto, Error, Partial<TeacherProfileInput>>({
    networkMode: 'always',
    mutationFn: (input) => teachingApi.updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.teachingProfile(), profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacher(profile.id) });
    },
  });
}

/** `GET /teacher/courses/:id/stats` (SC-28). */
export function useCourseStats(courseId: string) {
  return useQuery({
    queryKey: queryKeys.teachingStats(courseId),
    queryFn: () => teachingApi.stats(courseId),
    enabled: Boolean(courseId),
    staleTime: STALE_TIME.submissions,
  });
}

/** `GET /teacher/courses/:id/submissions?status=` (SC-29), infinite. */
export function useCourseSubmissions(courseId: string, filter: SubmissionFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.teachingSubmissions(courseId, filter),
    queryFn: ({ pageParam }) =>
      teachingApi.submissions(courseId, { status: filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: TeacherSubmissionsPage) => getNextPageNumber(lastPage),
    enabled: Boolean(courseId),
    staleTime: STALE_TIME.submissions,
  });
}

type SubmissionsData = InfiniteData<TeacherSubmissionsPage, number>;

/**
 * `PUT /teacher/submissions/:id/grade` (BR-26). The graded row is written into every cached list at
 * once, then the lists and stats are refetched (the "ungraded" filter drops the row, counts change).
 */
export function useGradeSubmission(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherSubmissionDto,
    Error,
    { submissionId: string } & GradeSubmissionRequest
  >({
    networkMode: 'always',
    mutationFn: ({ submissionId, ...body }) => teachingApi.grade(submissionId, body),
    onSuccess: (graded) => {
      queryClient.setQueriesData<SubmissionsData>(
        { queryKey: queryKeys.teachingSubmissionsAll(courseId) },
        (old) => mapPages(old, (item) => (item.id === graded.id ? graded : item)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teachingSubmissionsAll(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.teachingStats(courseId) });
    },
  });
}

/** `PUT /teacher/reviews/:id/reply` (BR-25): create or edit the reply; the saved reply replaces the cached one. */
export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation<ReviewDto, Error, { reviewId: string } & ReviewReplyRequest>({
    networkMode: 'always',
    mutationFn: ({ reviewId, reply }) => teachingApi.replyToReview(reviewId, { reply }),
    onSuccess: (saved) => {
      patchReviewEverywhere(queryClient, saved.id, (review) => ({
        ...review,
        teacherReply: saved.teacherReply,
        teacherRepliedAt: saved.teacherRepliedAt,
      }));
    },
  });
}

/** `DELETE /teacher/reviews/:id/reply`, optimistic: the reply disappears at once, comes back on failure. */
export function useDeleteReviewReply() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<ReviewDto, Error, string, QuerySnapshot>({
    networkMode: 'always',
    mutationFn: (reviewId) => teachingApi.deleteReviewReply(reviewId),
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ predicate: isReviewListQuery });
      const snapshot = snapshotQueries(queryClient, isReviewListQuery);
      patchReviewEverywhere(queryClient, reviewId, (review) => ({
        ...review,
        teacherReply: null,
        teacherRepliedAt: null,
      }));
      return snapshot;
    },
    onError: (error, _reviewId, snapshot) => {
      if (snapshot) restoreQueries(queryClient, snapshot);
      toast.error(getErrorMessage(error));
    },
  });
}

export type PinVariables = { answerId: string; isPinned: boolean };

/**
 * `PUT/DELETE /teacher/answers/:id/pin` (BR-24). `isPinned` is the CURRENT state (true -> unpin).
 * Optimistic: the answer moves to the top (and the previously pinned one is unpinned) at once; a
 * failure restores the list and toasts. The list is refetched afterwards so the server order wins.
 */
export function usePinAnswer(questionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<AnswerDto, Error, PinVariables, QuerySnapshot>({
    networkMode: 'always',
    mutationFn: ({ answerId, isPinned }) =>
      isPinned ? teachingApi.unpinAnswer(answerId) : teachingApi.pinAnswer(answerId),
    onMutate: async ({ answerId, isPinned }) => {
      const queryKey = queryKeys.questionAnswers(questionId);
      await queryClient.cancelQueries({ queryKey });
      const snapshot: QuerySnapshot = queryClient.getQueriesData({ queryKey });
      patchAnswerPin(queryClient, questionId, answerId, !isPinned);
      return snapshot;
    },
    onError: (error, _variables, snapshot) => {
      if (snapshot) restoreQueries(queryClient, snapshot);
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionAnswers(questionId) });
    },
  });
}
