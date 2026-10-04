import { z } from 'zod';

import { i18n } from '@/i18n';

/**
 * Client-side validation for SC-02 / SC-03 (PLAN.md §7.3): email format, password >= 8 with a
 * letter and a digit. Messages are lazy (`error: () => ...`) so they are translated when the form
 * is validated, in the language that is active at that moment.
 */

const emailField = z
  .string()
  .trim()
  .min(1, { error: () => i18n.t('auth:validation.emailRequired') })
  .pipe(z.email({ error: () => i18n.t('auth:validation.emailInvalid') }));

const passwordRules = z
  .string()
  .min(8, { error: () => i18n.t('auth:validation.passwordMin') })
  .regex(/[A-Za-z]/, { error: () => i18n.t('auth:validation.passwordLetter') })
  .regex(/\d/, { error: () => i18n.t('auth:validation.passwordNumber') });

export const loginSchema = z.object({
  email: emailField,
  // On login only presence is checked; the server decides whether credentials are valid.
  password: z.string().min(1, { error: () => i18n.t('auth:validation.passwordRequired') }),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: () => i18n.t('auth:validation.fullNameMin') })
      .max(60, { error: () => i18n.t('auth:validation.fullNameMax') }),
    email: emailField,
    password: passwordRules,
    confirmPassword: z.string().min(1, { error: () => i18n.t('auth:validation.confirmRequired') }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('auth:validation.passwordMismatch'),
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
