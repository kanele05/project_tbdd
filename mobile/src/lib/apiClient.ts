import { onlineManager } from '@tanstack/react-query';
import {
  create as createAxios,
  isAxiosError,
  type AxiosProgressEvent,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_TIMEOUT_MS, API_URL } from '@/constants/config';
import { i18n } from '@/i18n';
import type { ApiSuccess, Paginated } from '@/types/api';

import { AppError, toAppError } from './appError';

export { AppError, getErrorMessage, isAppError, toAppError } from './appError';

/**
 * The single axios instance of the app (CLAUDE.md §3). Feature code never imports axios; it uses
 * the typed helpers on `api` below, which unwrap the `{ data, meta }` envelope.
 *
 * Auth wiring is done through `setAccessToken` / `setUnauthorizedHandler` (called by `authStore`)
 * so this module has no dependency on the store (avoids an import cycle).
 */
export const apiClient = createAxios({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Set (or clear with `null`) the Bearer token attached to every request. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Register the callback fired when an authenticated request gets a 401 (=> log the user out). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
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

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const appError = toAppError(error);
    const hadToken = isAxiosError(error) && Boolean(error.config?.headers?.get('Authorization'));
    if (appError.status === 401 && hadToken) {
      unauthorizedHandler?.();
    }
    return Promise.reject(appError);
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
