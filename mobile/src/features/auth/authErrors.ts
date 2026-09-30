import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ERROR_MESSAGES } from '@/constants/strings';
import { getErrorMessage, getFieldErrors, toAppError } from '@/lib/appError';

/**
 * Show a server error on the form (PLAN.md §7.3 SC-02/03):
 * - 409 `EMAIL_TAKEN` -> error under the email field;
 * - 400 `VALIDATION_ERROR` with per-field details -> errors under those fields;
 * - anything else (401 `INVALID_CREDENTIALS`, network...) -> returned as a form-level message.
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
    setError('email' as Path<T>, { type: 'server', message: ERROR_MESSAGES.EMAIL_TAKEN });
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
  }

  return getErrorMessage(appError);
}
