import { onlineManager } from '@tanstack/react-query';
import {
  create as createAxios,
  isAxiosError,
  type AxiosProgressEvent,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_TIMEOUT_MS, API_URL } from '@/constants/config';
import { i18n } from '@/i18n';
import type { ApiSuccess, AuthSessionDto, Paginated } from '@/types/api';

import { AppError, toAppError } from './appError';

export { AppError, getErrorMessage, isAppError, toAppError } from './appError';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on the one replay that follows a successful token refresh (a request is never replayed twice). */
    _authRetried?: boolean;
  }
}

/**
 * The single axios instance of the app (CLAUDE.md §3). Feature code never imports axios; it uses
 * the typed helpers on `api` below, which unwrap the `{ data, meta }` envelope.
 *
 * Auth wiring is done through `setAuthTokens` / `setUnauthorizedHandler` /
 * `setTokensRefreshedHandler` (called by `authStore`) so this module has no dependency on the
 * store (avoids an import cycle).
 */
export const apiClient = createAxios({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/**
 * Plain instance used ONLY for `POST /auth/refresh`: it has no interceptors, so a failing refresh
 * can never trigger another refresh (no loop) and never carries the expired Bearer token.
 */
export const refreshClient = createAxios({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

export type AuthTokens = { accessToken: string; refreshToken: string };

let accessToken: string | null = null;
let refreshToken: string | null = null;
/** Bumped whenever the session is replaced or cleared so an in-flight refresh knows it is stale. */
let sessionVersion = 0;
let unauthorizedHandler: (() => void) | null = null;
let tokensRefreshedHandler: ((tokens: AuthTokens) => void | Promise<void>) | null = null;

/**
 * Replace the session tokens (login, bootstrap) or clear them (`null`). `refreshToken` is `null`
 * for a session that cannot be refreshed (an access token saved by an older app version).
 */
export function setAuthTokens(
  tokens: { accessToken: string | null; refreshToken: string | null } | null,
): void {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
  sessionVersion += 1;
}

/** Set only the access token (does not touch the refresh token). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

/** Register the callback fired when the session is over (refresh token refused / cannot refresh). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Register the callback that persists a rotated token pair (awaited before the replay is sent). */
export function setTokensRefreshedHandler(
  handler: ((tokens: AuthTokens) => void | Promise<void>) | null,
): void {
  tokensRefreshedHandler = handler;
}

/** Endpoints used WITHOUT a session: a 401 there is a wrong credential, not an expired token. */
const AUTH_ENTRY_PATH =
  /^\/auth\/(login|register|verify-email|resend-verification|2fa\/verify|forgot-password|reset-password|refresh|logout)\/?$/;

function isAuthEntryRequest(url: string | undefined): boolean {
  return AUTH_ENTRY_PATH.test((url ?? '').split('?')[0] ?? '');
}

function bearerOf(config: AxiosRequestConfig | undefined): string | null {
  const header = (config?.headers as { get?: (name: string) => unknown } | undefined)?.get?.(
    'Authorization',
  );
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Refresh outcome shared by every request that waited on the same refresh. */
type RefreshOutcome =
  | { kind: 'ok'; accessToken: string }
  /** The server refused the refresh token: the session is over. */
  | { kind: 'rejected'; error: AppError }
  /** Network / 5xx / rate limit: the session may still be fine, only this request failed. */
  | { kind: 'failed'; error: AppError }
  /** The user logged out (or another session started) while refreshing: drop the result. */
  | { kind: 'stale' };

let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function runRefresh(): Promise<RefreshOutcome> {
  const tokenUsed = refreshToken;
  if (!tokenUsed) {
    const error = new AppError({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'No session',
    });
    return { kind: 'rejected', error };
  }
  const version = sessionVersion;
  try {
    const res = await refreshClient.post<ApiSuccess<AuthSessionDto>>('/auth/refresh', {
      refreshToken: tokenUsed,
    });
    if (version !== sessionVersion) return { kind: 'stale' };
    const session = res.data.data;
    accessToken = session.accessToken;
    refreshToken = session.refreshToken;
    try {
      // Persist BEFORE replaying: the old refresh token is dead now, losing the new one = logged out.
      await tokensRefreshedHandler?.({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    } catch {
      // Storage failure: the in-memory session keeps working for this run.
    }
    return { kind: 'ok', accessToken: session.accessToken };
  } catch (error) {
    if (version !== sessionVersion) return { kind: 'stale' };
    const appError = toAppError(error);
    const isRefused = appError.status === 400 || appError.status === 401 || appError.status === 403;
    return isRefused ? { kind: 'rejected', error: appError } : { kind: 'failed', error: appError };
  }
}

/** Single-flight: concurrent callers share one `POST /auth/refresh`. */
function refreshOnce(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh()
      .then((outcome) => {
        if (outcome.kind === 'rejected') unauthorizedHandler?.();
        return outcome;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Get a fresh access token with the refresh token (both are rotated). Throws an `AppError` when
 * that is not possible: status 400/401/403 = the refresh token was refused (the session is over,
 * `unauthorizedHandler` already ran); anything else (network, 5xx) = try again later.
 * Used by the bootstrap and by code that bypasses axios (the AI chat stream).
 */
export async function refreshAccessToken(): Promise<string> {
  const outcome = await refreshOnce();
  if (outcome.kind === 'ok') return outcome.accessToken;
  if (outcome.kind === 'stale') {
    throw new AppError({ status: 0, code: 'CANCELED', message: 'Session changed' });
  }
  throw outcome.error;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  // The server localizes AI replies (and later other texts) by this header.
  config.headers.set('Accept-Language', i18n.language);
  // Writes are blocked while offline (PLAN.md §10); the UI shows "You're offline".
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && !onlineManager.isOnline()) {
    return Promise.reject(
      new AppError({ status: 0, code: 'OFFLINE', message: i18n.t('errors:offline') }),
    );
  }
  return config;
});

/**
 * 401 on a request that carried a Bearer token: the access token (15 min) most likely expired.
 * Refresh once (shared by every concurrent request) and replay the request with the new token.
 * What cannot be recovered ends the session through `unauthorizedHandler`.
 */
async function recoverFromUnauthorized(
  config: InternalAxiosRequestConfig,
  appError: AppError,
): Promise<AxiosResponse> {
  // A replay that still gets 401, or a session without refresh token: nothing left to try.
  if (config._authRetried || !refreshToken) {
    unauthorizedHandler?.();
    throw appError;
  }

  let freshToken: string;
  if (accessToken && bearerOf(config) !== accessToken) {
    // Another request already refreshed after this one was sent: replay with the new token.
    freshToken = accessToken;
  } else {
    const outcome = await refreshOnce();
    if (outcome.kind === 'failed') throw outcome.error;
    if (outcome.kind !== 'ok') throw appError;
    freshToken = outcome.accessToken;
  }

  config._authRetried = true;
  config.headers.set('Authorization', `Bearer ${freshToken}`);
  return apiClient.request(config);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const appError = toAppError(error);
    if (
      appError.status === 401 &&
      isAxiosError(error) &&
      error.config &&
      bearerOf(error.config) &&
      !isAuthEntryRequest(error.config.url)
    ) {
      return recoverFromUnauthorized(error.config, appError);
    }
    throw appError;
  },
);

type Params = Record<string, unknown>;

/** Drop `undefined` / `null` / empty-string params so they are not sent as `?q=`. */
function cleanParams(params?: Params): Params | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

async function get<T>(url: string, params?: Params, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<ApiSuccess<T>>(url, { ...config, params: cleanParams(params) });
  return res.data.data;
}

/** GET returning the whole envelope, for endpoints that carry extra `meta` (e.g. unreadCount). */
async function getWithMeta<T, M = object>(
  url: string,
  params?: Params,
  config?: AxiosRequestConfig,
): Promise<{ data: T; meta: M }> {
  const res = await apiClient.get<{ data: T; meta: M }>(url, {
    ...config,
    params: cleanParams(params),
  });
  return { data: res.data.data, meta: res.data.meta };
}

/** GET a paginated list: `{ data: T[], meta: { page, limit, total, totalPages, ...M } }`. */
async function getPage<T, M = object>(
  url: string,
  params?: Params,
  config?: AxiosRequestConfig,
): Promise<Paginated<T, M>> {
  const res = await apiClient.get<Paginated<T, M>>(url, {
    ...config,
    params: cleanParams(params),
  });
  return res.data;
}

async function post<T = void>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.post<ApiSuccess<T> | undefined>(url, body, config);
  return res.data?.data as T;
}

async function put<T = void>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.put<ApiSuccess<T> | undefined>(url, body, config);
  return res.data?.data as T;
}

async function patch<T = void>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.patch<ApiSuccess<T> | undefined>(url, body, config);
  return res.data?.data as T;
}

async function del<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<ApiSuccess<T> | undefined>(url, config);
  return res.data?.data as T;
}

/** multipart/form-data upload (avatar, project submission) with optional progress callback. */
async function postForm<T = void>(
  url: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const res = await apiClient.post<ApiSuccess<T> | undefined>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return res.data?.data as T;
}

/**
 * Typed helpers used by `features/<x>/api.ts`. Each returns the unwrapped `data` (204 => undefined).
 * Errors are always `AppError`.
 */
export const api = { get, getWithMeta, getPage, post, put, patch, delete: del, postForm };
