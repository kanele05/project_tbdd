import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { getNextPageNumber } from '@/features/learning/pages';
import { getErrorMessage } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { AnswerDto, LikeResponse, Paginated, QuestionDto } from '@/types/api';

import { qaApi } from './api';
import {
  findCachedQuestion,
  isCourseQuestionsQuery,
  patchQuestionEverywhere,
  restoreQuestionCaches,
  snapshotQuestionCaches,
  type QuestionSnapshot,
} from './cache';

/** `GET /courses/:id/questions` (infinite, staleTime 30 s). */
export function useCourseQuestions(courseId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.courseQuestions(courseId),
    queryFn: ({ pageParam }) => qaApi.questions(courseId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Paginated<QuestionDto>) => getNextPageNumber(lastPage),
    staleTime: STALE_TIME.questions,
  });
}

/** `GET /questions/:id`; a question already in a loaded list is shown instantly. */
export function useQuestion(questionId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.question(questionId),
    queryFn: () => qaApi.question(questionId),
    staleTime: STALE_TIME.questions,
    placeholderData: () => findCachedQuestion(queryClient, questionId),
  });
}

/** `GET /questions/:id/answers` (infinite, staleTime 30 s). */
export function useQuestionAnswers(questionId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.questionAnswers(questionId),
    queryFn: ({ pageParam }) => qaApi.answers(questionId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Paginated<AnswerDto>) => getNextPageNumber(lastPage),
    staleTime: STALE_TIME.answers,
  });
}

/** `POST /courses/:id/questions`. Failures (offline, 403...) toast and reject to the caller. */
export function useCreateQuestion(courseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<QuestionDto, Error, string>({
    // Offline writes must reach `apiClient`, which rejects them with `OFFLINE`.
    networkMode: 'always',
    mutationFn: (content) => qaApi.createQuestion(courseId, content),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseQuestions(courseId) });
    },
  });
}

/** `POST /questions/:id/answers`: refreshes the replies and bumps the comment count. */
export function useCreateAnswer(questionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<AnswerDto, Error, string>({
    networkMode: 'always',
    mutationFn: (content) => qaApi.createAnswer(questionId, content),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSuccess: () => {
      patchQuestionEverywhere(queryClient, questionId, (question) => ({
        ...question,
        answerCount: question.answerCount + 1,
      }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionAnswers(questionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.question(questionId), exact: true });
    },
  });
}

type LikeVariables = { questionId: string; isLiked: boolean };

/**
 * `PUT/DELETE /questions/:id/like` with an optimistic update of every cache holding the question
 * (lists + detail), rolled back with a toast on failure (PLAN.md §10).
 */
export function useToggleQuestionLike() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<LikeResponse, Error, LikeVariables, QuestionSnapshot>({
    networkMode: 'always',
    mutationFn: ({ questionId, isLiked }) =>
      isLiked ? qaApi.unlike(questionId) : qaApi.like(questionId),
    onMutate: async ({ questionId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.question(questionId), exact: true });
      await queryClient.cancelQueries({ predicate: isCourseQuestionsQuery });
      const snapshot = snapshotQuestionCaches(queryClient, questionId);
      patchQuestionEverywhere(queryClient, questionId, (question) => ({
        ...question,
        isLiked: !isLiked,
        likeCount: Math.max(0, question.likeCount + (isLiked ? -1 : 1)),
      }));
      return snapshot;
    },
    onError: (error, { questionId }, snapshot) => {
      if (snapshot) restoreQuestionCaches(queryClient, questionId, snapshot);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (data, { questionId }) => {
      patchQuestionEverywhere(queryClient, questionId, (question) => ({
        ...question,
        isLiked: data.isLiked,
        likeCount: data.likeCount,
      }));
    },
    onSettled: (_data, _error, { questionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.question(questionId), exact: true });
    },
  });
}
