import { z } from 'zod';

import { i18n } from '@/i18n';

import { REASON_MAX_LENGTH, REASON_MIN_LENGTH } from './adminMeta';

/**
 * Reason forms of the admin screens. Messages are lazy (`error: () => ...`) so they are translated
 * when the form is validated, in the language active at that moment.
 */
const tooShort = { error: () => i18n.t('admin:reason.tooShort', { min: REASON_MIN_LENGTH }) };
const tooLong = { error: () => i18n.t('admin:reason.tooLong', { max: REASON_MAX_LENGTH }) };

/** Required reason (reject a course, disable a user): 5-500 chars after trimming. */
export const requiredReasonSchema = z.object({
  reason: z.string().trim().min(REASON_MIN_LENGTH, tooShort).max(REASON_MAX_LENGTH, tooLong),
});

/** Optional reason (archive): empty, or 5-500 chars after trimming. */
export const optionalReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(REASON_MAX_LENGTH, tooLong)
    .refine((value) => value.length === 0 || value.length >= REASON_MIN_LENGTH, tooShort),
});

export type ReasonFormValues = z.infer<typeof requiredReasonSchema>;
