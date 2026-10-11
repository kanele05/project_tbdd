import type { InfiniteData, Query, QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import type { AnswerDto, Paginated, ReviewDto } from '@/types/api';

type Identified = { id: string };
type PagesOf<T extends Identified> = InfiniteData<Paginated<T>, number>;

/** `['course', id, 'reviews', filter]` (course review lists) or `['teacher', id, 'reviews']`. */
export function isReviewListQuery(query: Query): boolean {
  const [root, , sub] = query.queryKey;
  return (root === 'course' || root === 'teacher') && sub === 'reviews';
}

/** `['course', id, 'my-review']`: the signed-in user's own review of a course. */
export function isMyReviewQuery(query: Query): boolean {
  return query.queryKey[0] === 'course' && query.queryKey[2] === 'my-review';
}

/** `['question', id, 'answers']`: the replies of one question. */
export function isAnswerListQuery(query: Query): boolean {
  return query.queryKey[0] === 'question' && query.queryKey[2] === 'answers';
}

/** Maps every item of an infinite list (keeping each page's `meta`); returns undefined for no data. */
export function mapPages<T extends Identified, P extends { data: T[] }>(
  data: InfiniteData<P, number> | undefined,
  mapItem: (item: T) => T,
): InfiniteData<P, number> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, data: page.data.map(mapItem) })) };
}

/** Moves pinned answers to the top of the loaded list, keeping the size of every page. */
export function sortPinnedFirst(
  data: PagesOf<AnswerDto> | undefined,
): PagesOf<AnswerDto> | undefined {
  if (!data) return data;
  const sorted = data.pages
    .flatMap((page) => page.data)
    .map((answer, index) => ({ answer, index }))
    .sort((a, b) => Number(b.answer.isPinned) - Number(a.answer.isPinned) || a.index - b.index)
    .map((entry) => entry.answer);
  let offset = 0;
  return {
    ...data,
    pages: data.pages.map((page) => {
      const slice = sorted.slice(offset, offset + page.data.length);
      offset += page.data.length;
      return { ...page, data: slice };
    }),
  };
}

export type QuerySnapshot = [QueryKey, unknown][];

/** Current data of every query matching `predicate`, to restore after a failed optimistic update. */
export function snapshotQueries(
  queryClient: QueryClient,
  predicate: (query: Query) => boolean,
): QuerySnapshot {
  return queryClient.getQueriesData({ predicate });
}

export function restoreQueries(queryClient: QueryClient, snapshot: QuerySnapshot): void {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

/** Applies `patch` to the review `reviewId` in every review list and in "my review" caches. */
export function patchReviewEverywhere(
  queryClient: QueryClient,
  reviewId: string,
  patch: (review: ReviewDto) => ReviewDto,
): void {
  queryClient.setQueriesData<PagesOf<ReviewDto>>({ predicate: isReviewListQuery }, (old) =>
    mapPages<ReviewDto, Paginated<ReviewDto>>(old, (review) =>
      review.id === reviewId ? patch(review) : review,
    ),
  );
  queryClient.setQueriesData<ReviewDto | null>({ predicate: isMyReviewQuery }, (old) =>
    old && old.id === reviewId ? patch(old) : old,
  );
}

/** Sets `isPinned` on one answer and unpins the others of the list (at most one is pinned). */
export function patchAnswerPin(
  queryClient: QueryClient,
  questionId: string,
  answerId: string,
  isPinned: boolean,
): void {
  queryClient.setQueryData<PagesOf<AnswerDto>>(queryKeys.questionAnswers(questionId), (old) =>
    sortPinnedFirst(
      mapPages<AnswerDto, Paginated<AnswerDto>>(old, (answer) => {
        if (answer.id === answerId) return { ...answer, isPinned };
        return isPinned && answer.isPinned ? { ...answer, isPinned: false } : answer;
      }),
    ),
  );
}
