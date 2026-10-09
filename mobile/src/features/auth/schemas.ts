import { z } from 'zod';

import { i18n } from '@/i18n';

/**
 * Client-side validation for the auth forms (PLAN.md §7.3 / §13 AUTH-08): email format, password
 * 8-72 characters with a letter and a digit (the server's rules), 6-digit codes. Messages are lazy
 * (`error: () => ...`) so they are translated when the form is validated, in the language that is
 * active at that moment.
 */

export const OTP_LENGTH = 6;
/** bcrypt only reads the first 72 bytes, so the server (and we) cap the password there. */
export const PASSWORD_MAX_LENGTH = 72;

export const emailField = z
  .string()
  .trim()
  .min(1, { error: () => i18n.t('auth:validation.emailRequired') })
  .pipe(z.email({ error: () => i18n.t('auth:validation.emailInvalid') }));

export const passwordRules = z
  .string()
  .min(8, { error: () => i18n.t('auth:validation.passwordMin') })
  .max(PASSWORD_MAX_LENGTH, { error: () => i18n.t('auth:validation.passwordMax') })
  .regex(/[A-Za-z]/, { error: () => i18n.t('auth:validation.passwordLetter') })
  .regex(/\d/, { error: () => i18n.t('auth:validation.passwordNumber') });

/** The 6-digit code from an email / authenticator app. */
export const otpCodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: () => i18n.t('auth:validation.codeInvalid') });

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
    role: z.enum(['STUDENT', 'TEACHER']),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('auth:validation.passwordMismatch'),
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    code: otpCodeField,
    password: passwordRules,
    confirmPassword: z.string().min(1, { error: () => i18n.t('auth:validation.confirmRequired') }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('auth:validation.passwordMismatch'),
  });

/** Alphabet of the server's recovery codes (no 0/O/1/I): `XXXXX-XXXXX`. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_LENGTH = 10;

/**
 * Format what the user types as a recovery code: upper case, only the valid alphabet, a dash after
 * the fifth character ("abcde fghjk" -> "ABCDE-FGHJK"). Never longer than a real code.
 */
export function formatRecoveryCode(input: string): string {
  const characters = [...input.toUpperCase()]
    .filter((character) => RECOVERY_ALPHABET.includes(character))
    .slice(0, RECOVERY_LENGTH)
    .join('');
  return characters.length > 5 ? `${characters.slice(0, 5)}-${characters.slice(5)}` : characters;
}

/** `true` for a complete `XXXXX-XXXXX` code. */
export function isCompleteRecoveryCode(input: string): boolean {
  return formatRecoveryCode(input).length === RECOVERY_LENGTH + 1;
}

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
