import { z } from 'zod';

import { i18n } from '@/i18n';

/** BR-25: a reply has 1-1000 characters. */
export const REPLY_MAX_LENGTH = 1000;
/** BR-26: feedback has 1-2000 characters, the grade is a whole number 0-100. */
export const FEEDBACK_MAX_LENGTH = 2000;
export const GRADE_MAX = 100;

export const JOB_TITLE_MAX_LENGTH = 100;
export const BIO_MAX_LENGTH = 2000;
export const ORGANIZATION_MAX_LENGTH = 100;
export const LOCATION_MAX_LENGTH = 100;

/** Messages are lazy (`error: () => ...`): translated when the form is validated. */
export const replySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('review:reply.validation.required') })
    .max(REPLY_MAX_LENGTH, {
      error: () => i18n.t('review:reply.validation.max', { max: REPLY_MAX_LENGTH }),
    }),
});

export type ReplyFormValues = z.infer<typeof replySchema>;

export const gradeSchema = z.object({
  /** Typed text; converted to a number on submit. */
  grade: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('teaching:submissions.validation.gradeRequired') })
    .refine((value) => /^\d{1,3}$/.test(value) && Number(value) <= GRADE_MAX, {
      error: () => i18n.t('teaching:submissions.validation.gradeRange'),
    }),
  feedback: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('teaching:submissions.validation.feedbackRequired') })
    .max(FEEDBACK_MAX_LENGTH, {
      error: () =>
        i18n.t('teaching:submissions.validation.feedbackMax', { max: FEEDBACK_MAX_LENGTH }),
    }),
});

export type GradeFormValues = z.infer<typeof gradeSchema>;

/** True for an IANA time zone id the runtime knows ("Asia/Ho_Chi_Minh", "UTC"). */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const teacherProfileSchema = z.object({
  jobTitle: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('teaching:profile.validation.jobTitleRequired') })
    .max(JOB_TITLE_MAX_LENGTH, {
      error: () => i18n.t('teaching:profile.validation.jobTitleMax', { max: JOB_TITLE_MAX_LENGTH }),
    }),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, {
      error: () => i18n.t('teaching:profile.validation.bioMax', { max: BIO_MAX_LENGTH }),
    }),
  organization: z
    .string()
    .trim()
    .max(ORGANIZATION_MAX_LENGTH, {
      error: () =>
        i18n.t('teaching:profile.validation.organizationMax', { max: ORGANIZATION_MAX_LENGTH }),
    }),
  location: z
    .string()
    .trim()
    .max(LOCATION_MAX_LENGTH, {
      error: () => i18n.t('teaching:profile.validation.locationMax', { max: LOCATION_MAX_LENGTH }),
    }),
  timezone: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidTimeZone(value), {
      error: () => i18n.t('teaching:profile.validation.timezoneInvalid'),
    }),
});

export type TeacherProfileFormValues = z.infer<typeof teacherProfileSchema>;
