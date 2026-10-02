import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const courseIdParams = z.object({ id: z.string().trim().min(1).max(100) });

/** `GET /courses/:id/reviews?rating=&page=&limit=` (rating = lọc theo số sao). */
export const listReviewsQuery = paginationQuery.extend({
  rating: z.coerce
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
});

/** BR-08: rating nguyên 1-5, nội dung 10-1000 ký tự. */
export const upsertReviewBody = z.object({
  rating: z
    .number({ error: 'Rating is required' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  content: z
    .string({ error: 'Review content is required' })
    .trim()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must be at most 1000 characters'),
});

export type CourseIdParams = z.infer<typeof courseIdParams>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuery>;
export type UpsertReviewBody = z.infer<typeof upsertReviewBody>;
