import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type { ReviewDto, ReviewSummaryDto } from '@/types/api';

/** Body of `PUT /courses/:id/reviews/me` (BR-08): rating 1-5, content 10-1000 characters. */
export type ReviewInput = { rating: number; content: string };

/** HTTP calls of the reviews feature (SC-09 Review tab, SC-10, SC-11). */
export const reviewApi = {
  /**
   * `GET /courses/:id/reviews?rating=&page=&limit=` - `meta.summary` carries the average, the
   * total and the number of reviews per star.
   */
  list: (courseId: string, params: { rating?: number; page: number }) =>
    api.getPage<ReviewDto, { summary: ReviewSummaryDto }>(`/courses/${courseId}/reviews`, {
      rating: params.rating,
      page: params.page,
      limit: PAGE_SIZE,
    }),

  /** `GET /courses/:id/reviews/me` - my review, or `null` when I have not reviewed yet. */
  mine: async (courseId: string): Promise<ReviewDto | null> =>
    (await api.get<ReviewDto | null>(`/courses/${courseId}/reviews/me`)) ?? null,

  /** `PUT /courses/:id/reviews/me` - creates or edits my review (403 unless enrolled). */
  save: (courseId: string, input: ReviewInput) =>
    api.put<ReviewDto>(`/courses/${courseId}/reviews/me`, input),
};
