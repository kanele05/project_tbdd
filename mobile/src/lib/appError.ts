import { isAxiosError, isCancel } from 'axios';

import { hasTranslation, i18n, tr } from '@/i18n';
import type { ApiErrorBody } from '@/types/api';

type AppErrorInit = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Normalized error thrown by every API call.
 * `status` is the HTTP status, or `0` when there was no response (network / timeout / offline).
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor({ status, code, message, details }: AppErrorInit) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.code === 'OFFLINE';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === 'object' &&
    inner !== null &&
    typeof (inner as { code?: unknown }).code === 'string' &&
    typeof (inner as { message?: unknown }).message === 'string'
  );
}

/** Convert anything thrown (axios error, AppError, Error, unknown) into an `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isAxiosError(error)) {
    if (isCancel(error)) {
      return new AppError({ status: 0, code: 'CANCELED', message: 'Request canceled' });
    }
    const response = error.response;
    if (response) {
      if (isApiErrorBody(response.data)) {
        const { code, message, details } = response.data.error;
        return new AppError({ status: response.status, code, message, details });
      }
      return new AppError({
        status: response.status,
        code: response.status === 401 ? 'UNAUTHORIZED' : `HTTP_${response.status}`,
        message: i18n.t('errors:generic'),
      });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AppError({ status: 0, code: 'TIMEOUT', message: i18n.t('errors:timeout') });
    }
    return new AppError({ status: 0, code: 'NETWORK_ERROR', message: i18n.t('errors:network') });
  }

  if (error instanceof Error) {
    return new AppError({ status: 0, code: 'UNKNOWN', message: error.message });
  }
  return new AppError({ status: 0, code: 'UNKNOWN', message: i18n.t('errors:generic') });
}

/** Translated message for a server/client error `code`, or `undefined` when none is defined. */
export function getErrorMessageForCode(code: string): string | undefined {
  const key = `errors:codes.${code}`;
  return hasTranslation(key) ? tr(key) : undefined;
}

/**
 * Friendly message to show a user (toast / ErrorState / form banner), in the current language.
 * Prefers the message mapped to the error code, then the server message, then a generic one.
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  return getErrorMessageForCode(appError.code) ?? (appError.message || i18n.t('errors:generic'));
}

/**
 * Field-level validation errors from a `VALIDATION_ERROR` response, if the server sent them as
 * `details: { fieldName: "message" }`, `details: [{ source, field, message }]` (server format) or
 * the older `details: [{ path, message }]`.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  const appError = toAppError(error);
  const details = appError.details;
  const result: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const item of details) {
      if (typeof item === 'object' && item !== null) {
        const { path, field, message } = item as {
          path?: unknown;
          field?: unknown;
          message?: unknown;
        };
        const rawKey = field ?? path;
        const key = Array.isArray(rawKey)
          ? rawKey.join('.')
          : typeof rawKey === 'string'
            ? rawKey
            : '';
        if (key && typeof message === 'string' && !(key in result)) result[key] = message;
      }
    }
  } else if (typeof details === 'object' && details !== null) {
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') result[key] = value;
      else if (Array.isArray(value) && typeof value[0] === 'string') result[key] = value[0];
    }
  }
  return result;
}
