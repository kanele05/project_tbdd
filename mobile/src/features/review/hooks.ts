import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { getNextPageNumber } from '@/features/learning/pages';
import { queryKeys } from '@/lib/queryKeys';
import type { ReviewDto, ReviewsPage } from '@/types/api';

import { reviewApi, type ReviewInput } from './api';

/** Star filter of the review lists: every review, or only one rating (1-5). */
export type ReviewFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export const REVIEW_FILTERS: readonly ReviewFilter[] = ['all', 5, 4, 3, 2, 1];

/**
 * `GET /courses/:id/reviews` (infinite). The Review tab and SC-10 share this query (same key and
 * page size), so opening "View all" does not refetch what the tab already loaded.
 */
export function useCourseReviews(courseId: string, filter: ReviewFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.courseReviews(courseId, filter),
    queryFn: ({ pageParam }) =>
      reviewApi.list(courseId, { rating: filter === 'all' ? undefined : filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ReviewsPage) => getNextPageNumber(lastPage),
    staleTime: STALE_TIME.reviews,
  });
}

/**
 * Average, total and per-star counts of the whole course. Always read from the unfiltered list so
 * the headline does not change when a star filter is selected.
 */
export function useReviewSummary(courseId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.courseReviews(courseId, 'all'),
    queryFn: ({ pageParam }) => reviewApi.list(courseId, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ReviewsPage) => getNextPageNumber(lastPage),
    staleTime: STALE_TIME.reviews,
    select: (data) => data.pages[0]?.meta.summary,
  });
}

/** `GET /courses/:id/reviews/me` - the current user's review (or `null`). */
export function useMyReview(courseId: string, isEnabled = true) {
  return useQuery({
    queryKey: queryKeys.courseMyReview(courseId),
    queryFn: () => reviewApi.mine(courseId),
    enabled: isEnabled,
    staleTime: STALE_TIME.reviews,
  });
}

/**
 * `PUT /courses/:id/reviews/me` (create or edit, BR-08). On success the saved review is cached as
 * "my review" and every review list + the course (rating average/count) is refreshed.
 */
export function useSaveReview(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<ReviewDto, Error, ReviewInput>({
    // Offline writes must reach `apiClient`, which rejects them with `OFFLINE` (toast).
    networkMode: 'always',
    mutationFn: (input) => reviewApi.save(courseId, input),
    onSuccess: (review) => {
      queryClient.setQueryData(queryKeys.courseMyReview(courseId), review);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseReviewsAll(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    },
  });
}
