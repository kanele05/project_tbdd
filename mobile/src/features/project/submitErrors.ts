import { ERROR_MESSAGES } from '@/constants/strings';
import { getErrorMessage, isAppError } from '@/lib/appError';

/**
 * Friendly message for a failed `POST /courses/:id/submissions`: 413 (too large), 415 (wrong type)
 * and 403 (not enrolled) get a specific sentence even when the server sent another code.
 */
export function getSubmitErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    if (error.status === 413) return ERROR_MESSAGES.FILE_TOO_LARGE ?? getErrorMessage(error);
    if (error.status === 415) return ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE ?? getErrorMessage(error);
    if (error.status === 403)
      return 'You need to enroll in this course before submitting a project.';
  }
  return getErrorMessage(error);
}
