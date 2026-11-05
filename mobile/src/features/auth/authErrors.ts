import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { i18n, tr } from '@/i18n';
import { getErrorMessage, getFieldErrors, toAppError } from '@/lib/appError';

/** The extra data the auth endpoints put in `error.details` (PLAN.md §9.4). */
export type AuthErrorDetails = {
  /** INVALID_CREDENTIALS / CAPTCHA_*: the next attempt must carry a CAPTCHA token. */
  captchaRequired?: boolean;
  /** ACCOUNT_LOCKED / RESEND_TOO_SOON: seconds until the next attempt is allowed. */
  retryAfterSec?: number;
  /** INVALID_CODE: tries left on the current code. */
  attemptsLeft?: number;
  /** EMAIL_NOT_VERIFIED: the account to verify and the seconds before a new code can be sent. */
  email?: string;
  resendAfter?: number;
};

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Typed view of `error.details` (ignores anything that is not the expected shape). */
export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  const details = toAppError(error).details;
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return {};
  const source = details as Record<string, unknown>;
  return {
    captchaRequired: source.captchaRequired === true ? true : undefined,
    retryAfterSec: readNumber(source, 'retryAfterSec'),
    attemptsLeft: readNumber(source, 'attemptsLeft'),
    email: typeof source.email === 'string' ? source.email : undefined,
    resendAfter: readNumber(source, 'resendAfter'),
  };
}

/** Whole minutes (rounded up) for the "try again in N minutes" lock message. */
function toMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

/**
 * Message for an auth error, with the numbers the server sent filled in ("2 attempts left",
 * "try again in 15 minutes"); everything else falls back to the generic code mapping.
 */
export function getAuthErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  const { attemptsLeft, retryAfterSec } = getAuthErrorDetails(appError);
  if (appError.code === 'INVALID_CODE' && attemptsLeft !== undefined) {
    return tr('errors:codes.INVALID_CODE_attemptsLeft', { attempts: attemptsLeft });
  }
  if (appError.code === 'ACCOUNT_LOCKED' && retryAfterSec !== undefined) {
    return tr('errors:codes.ACCOUNT_LOCKED_minutes', { minutes: toMinutes(retryAfterSec) });
  }
  if (appError.code === 'RESEND_TOO_SOON' && retryAfterSec !== undefined) {
    return tr('errors:codes.RESEND_TOO_SOON_seconds', { seconds: retryAfterSec });
  }
  return getErrorMessage(appError);
}

/** Codes after which the OTP in progress is useless and the user has to ask for a new one. */
export function isDeadCodeError(error: unknown): boolean {
  const { code } = toAppError(error);
  return code === 'CODE_EXPIRED' || code === 'TOO_MANY_ATTEMPTS';
}

/**
 * Show a server error on the form (PLAN.md §7.3 SC-02/03):
 * - 409 `EMAIL_TAKEN` -> error under the email field;
 * - 400 `VALIDATION_ERROR` with per-field details -> errors under those fields;
 * - 400 `VALIDATION_ERROR` on `captchaToken` only -> the CAPTCHA failed message;
 * - anything else (401 `INVALID_CREDENTIALS`, 400 `INVALID_CODE`, network...) -> returned as a
 *   form-level message.
 *
 * @returns the form-level message to display, or `null` when the error was placed on a field.
 */
export function applyAuthError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const appError = toAppError(error);

  if (appError.code === 'EMAIL_TAKEN' && fields.includes('email' as Path<T>)) {
    setError('email' as Path<T>, { type: 'server', message: i18n.t('errors:codes.EMAIL_TAKEN') });
    return null;
  }

  if (appError.code === 'VALIDATION_ERROR') {
    const fieldErrors = getFieldErrors(appError);
    let placed = false;
    for (const field of fields) {
      const message = fieldErrors[field];
      if (message) {
        setError(field, { type: 'server', message });
        placed = true;
      }
    }
    if (placed) return null;
    // The CAPTCHA token is not a visible field: tell the user to verify again.
    if (fieldErrors.captchaToken) return i18n.t('errors:codes.CAPTCHA_FAILED');
  }

  return getAuthErrorMessage(appError);
}
