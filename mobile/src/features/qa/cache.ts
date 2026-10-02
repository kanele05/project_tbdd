import type { InfiniteData, Query, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import type { Paginated, QuestionDto } from '@/types/api';

export type QuestionsData = InfiniteData<Paginated<QuestionDto>, number>;

/** Matches `['course', id, 'questions']` - the question list of any course. */
export function isCourseQuestionsQuery(query: Query): boolean {
  return query.queryKey[0] === 'course' && query.queryKey[2] === 'questions';
}

function patchList(
  data: QuestionsData | undefined,
  questionId: string,
  patch: (question: QuestionDto) => QuestionDto,
): QuestionsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((question) => (question.id === questionId ? patch(question) : question)),
    })),
  };
}

/**
 * Apply `patch` to a question in every cache that holds it: the detail (`['question', id]`) and
 * the question lists of any course. (The detail screen does not know the course id, hence the
 * predicate instead of one list key.)
 */
export function patchQuestionEverywhere(
  queryClient: QueryClient,
  questionId: string,
  patch: (question: QuestionDto) => QuestionDto,
): void {
  queryClient.setQueryData<QuestionDto>(queryKeys.question(questionId), (old) =>
    old ? patch(old) : old,
  );
  queryClient.setQueriesData<QuestionsData>({ predicate: isCourseQuestionsQuery }, (old) =>
    patchList(old, questionId, patch),
  );
}

/** A question already loaded in some list: instant placeholder for the detail screen. */
export function findCachedQuestion(
  queryClient: QueryClient,
  questionId: string,
): QuestionDto | undefined {
  const lists = queryClient.getQueriesData<QuestionsData>({ predicate: isCourseQuestionsQuery });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const found = page.data.find((question) => question.id === questionId);
      if (found) return found;
    }
  }
  return undefined;
}

export type QuestionSnapshot = {
  single: QuestionDto | undefined;
  lists: [readonly unknown[], QuestionsData | undefined][];
};

export function snapshotQuestionCaches(
  queryClient: QueryClient,
  questionId: string,
): QuestionSnapshot {
  return {
    single: queryClient.getQueryData<QuestionDto>(queryKeys.question(questionId)),
    lists: queryClient.getQueriesData<QuestionsData>({ predicate: isCourseQuestionsQuery }),
  };
}

export function restoreQuestionCaches(
  queryClient: QueryClient,
  questionId: string,
  snapshot: QuestionSnapshot,
): void {
  if (snapshot.single) queryClient.setQueryData(queryKeys.question(questionId), snapshot.single);
  for (const [key, data] of snapshot.lists) queryClient.setQueryData(key, data);
}
