import { z } from 'zod';

import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH, REVIEW_STRINGS } from './strings';

/** SC-11 / BR-08: whole rating 1-5 and 10-1000 characters of text. */
export const reviewSchema = z.object({
  rating: z
    .number({ error: REVIEW_STRINGS.ratingRequired })
    .int(REVIEW_STRINGS.ratingRequired)
    .min(1, REVIEW_STRINGS.ratingRequired)
    .max(5, REVIEW_STRINGS.ratingRequired),
  content: z
    .string()
    .trim()
    .min(REVIEW_MIN_LENGTH, REVIEW_STRINGS.contentMin)
    .max(REVIEW_MAX_LENGTH, REVIEW_STRINGS.contentMax),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
