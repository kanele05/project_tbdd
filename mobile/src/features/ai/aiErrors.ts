import { i18n } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';

import { AI_STREAM_ERROR } from './chatStream';

export type AiErrorInfo = {
  /** Friendly sentence in the current language. */
  message: string;
  /** `AI_RATE_LIMITED` only: seconds until the user may ask again (from `details.retryAfterSec`). */
  retryAfterSec: number | null;
  /** 403 `NOT_ENROLLED`: the AI features need an enrollment. */
  isNotEnrolled: boolean;
  /** The caller aborted the request (screen closed): nothing to show. */
  isCanceled: boolean;
  /** 401: the session ended. */
  isUnauthorized: boolean;
  /** 429 `AI_RATE_LIMITED` / 503 `AI_UNAVAILABLE`: retrying right now would not help. */
  isTemporary: boolean;
};

const MAX_RETRY_AFTER_SEC = 3600;

/** `details: { retryAfterSec: 42 }` -> 42 (rounded up, capped); anything else -> `null`. */
export function getRetryAfterSec(details: unknown): number | null {
  if (typeof details !== 'object' || details === null) return null;
  const value = (details as { retryAfterSec?: unknown }).retryAfterSec;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.ceil(value), MAX_RETRY_AFTER_SEC);
}

/**
 * Understands the errors of the AI endpoints (PLAN §9.4): 403 `NOT_ENROLLED`, 429
 * `AI_RATE_LIMITED` (+ `details.retryAfterSec`), 503 `AI_UNAVAILABLE`, 422 `AI_BLOCKED`, a dropped
 * stream, offline, 401. Messages come from the `errors` namespace so they follow the UI language.
 */
export function describeAiError(error: unknown): AiErrorInfo {
  const appError = toAppError(error);
  const isInterrupted = appError.code === AI_STREAM_ERROR.interrupted;
  return {
    message: isInterrupted ? i18n.t('ai:tutor.interrupted') : getErrorMessage(appError),
    retryAfterSec: appError.code === 'AI_RATE_LIMITED' ? getRetryAfterSec(appError.details) : null,
    isNotEnrolled: appError.code === 'NOT_ENROLLED',
    isCanceled: appError.code === AI_STREAM_ERROR.canceled,
    isUnauthorized: appError.status === 401,
    isTemporary: appError.code === 'AI_RATE_LIMITED' || appError.code === 'AI_UNAVAILABLE',
  };
}
