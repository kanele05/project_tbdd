import { z } from 'zod';

import { i18n } from '@/i18n';

export const REVIEW_MIN_LENGTH = 10;
export const REVIEW_MAX_LENGTH = 1000;

/** Lazy message: translated when the form is validated, in the language active at that moment. */
const ratingError = { error: () => i18n.t('review:validation.rating') };

/** SC-11 / BR-08: whole rating 1-5 and 10-1000 characters of text. */
export const reviewSchema = z.object({
  rating: z.number(ratingError).int(ratingError).min(1, ratingError).max(5, ratingError),
  content: z
    .string()
    .trim()
    .min(REVIEW_MIN_LENGTH, {
      error: () => i18n.t('review:validation.contentMin', { min: REVIEW_MIN_LENGTH }),
    })
    .max(REVIEW_MAX_LENGTH, {
      error: () => i18n.t('review:validation.contentMax', { max: REVIEW_MAX_LENGTH }),
    }),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
