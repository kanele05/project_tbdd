import { hasTranslation, tr } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';

/**
 * Friendly message for an error of an admin call: the admin-specific wording of the code
 * (`admin:errors.<CODE>`, e.g. `CANNOT_DISABLE_ADMIN`, `INVALID_COURSE_STATE`) first, then the
 * shared mapping of `errors:codes` / the server message.
 */
export function getAdminErrorMessage(error: unknown): string {
  const { code } = toAppError(error);
  const key = `admin:errors.${code}`;
  return hasTranslation(key) ? tr(key) : getErrorMessage(error);
}

/** 403 on an admin endpoint: the account is not (or no longer) an administrator. */
export function isForbiddenError(error: unknown): boolean {
  const appError = toAppError(error);
  return appError.status === 403 || appError.code === 'FORBIDDEN';
}
