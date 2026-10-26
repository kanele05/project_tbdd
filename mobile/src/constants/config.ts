import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

/**
 * Base URL of the REST API (`EXPO_PUBLIC_API_URL` in `mobile/.env`).
 * On a real phone this must be the LAN IP of the machine running the server, not `localhost`.
 */
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? '').trim() || DEFAULT_API_URL;

export const IS_API_URL_CONFIGURED = Boolean((process.env.EXPO_PUBLIC_API_URL ?? '').trim());

/** App version - used as the persisted-cache `buster` so a new version drops the old cache. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const API_TIMEOUT_MS = 15_000;
export const AI_REQUEST_TIMEOUT_MS = 120_000;

export type CaptchaProvider = 'turnstile' | 'recaptcha_v2';

export const CAPTCHA_PROVIDER: CaptchaProvider =
  process.env.EXPO_PUBLIC_CAPTCHA_PROVIDER === 'recaptcha_v2' ? 'recaptcha_v2' : 'turnstile';

/** Cloudflare's published "always passes" Turnstile site key: fine for dev, useless in production. */
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * Cloudflare Turnstile site key (`EXPO_PUBLIC_TURNSTILE_SITE_KEY`). Defaults to the test key so the
 * app works out of the box; a real deployment sets its own key (the server then holds the secret).
 */
export const TURNSTILE_SITE_KEY: string =
  (process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim() || TURNSTILE_TEST_SITE_KEY;

/**
 * Origin the native Turnstile WebView pretends to be served from (`EXPO_PUBLIC_TURNSTILE_BASE_URL`).
 * Turnstile checks its hostname against the domains of the site key, so in production this must be
 * a hostname listed there (e.g. the public site `https://elearning.example.com`). Defaults to the
 * origin of the API; the test key accepts any hostname.
 */
export const TURNSTILE_BASE_URL: string =
  (process.env.EXPO_PUBLIC_TURNSTILE_BASE_URL ?? '').trim() ||
  API_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');

const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export const RECAPTCHA_SITE_KEY: string =
  (process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '').trim() ||
  (__DEV__ ? RECAPTCHA_TEST_SITE_KEY : '');

function getRecaptchaDefaultBaseUrl(): string {
  try {
    const { hostname } = new URL(API_URL);
    return hostname ? `https://${hostname}` : '';
  } catch {
    return '';
  }
}

export const RECAPTCHA_BASE_URL: string =
  (process.env.EXPO_PUBLIC_RECAPTCHA_BASE_URL ?? '').trim() || getRecaptchaDefaultBaseUrl();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** TanStack Query `staleTime` per data type - PLAN.md §10. */
export const STALE_TIME = {
  me: 5 * MINUTE,
  home: 5 * MINUTE,
  categories: 24 * HOUR,
  hotTags: 24 * HOUR,
  courseList: 2 * MINUTE,
  course: 5 * MINUTE,
  curriculum: 1 * MINUTE,
  reviews: 5 * MINUTE,
  myCourses: 0,
  meStats: 0,
  meBookmarks: 1 * MINUTE,
  cart: 0,
  lesson: 0,
  questions: 30 * 1000,
  answers: 30 * 1000,
  project: 5 * MINUTE,
  submissions: 30 * 1000,
  teacher: 5 * MINUTE,
  notifications: 30 * 1000,
  /** AI answers are cached in the DB, so they rarely change. */
  ai: 1 * HOUR,
} as const;

/** Persisted query cache lives 24 h; `gcTime` must be >= this so restored queries are not dropped. */
export const CACHE_MAX_AGE_MS = 24 * HOUR;

export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 400;
export const MAX_RECENT_SEARCHES = 10;
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;
export const LESSON_COMPLETE_RATIO = 0.9; // BR-03
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Storage keys. Tokens go to SecureStore only; everything else to AsyncStorage. */
export const STORAGE_KEYS = {
  /** Access token (JWT, 15 min). The key keeps its pre-refresh-token name. */
  authToken: 'elearning.auth.token',
  /** Refresh token (30 days, single use, rotated on every refresh). */
  authRefreshToken: 'elearning.auth.refresh-token',
  queryCache: 'elearning.query-cache',
  recentSearches: 'elearning.recent-searches',
  /** `system | light | dark` (AsyncStorage). */
  themeMode: 'elearning.pref.theme-mode',
  /** `system | vi | en` (AsyncStorage). */
  language: 'elearning.pref.language',
  /** Outline lessons proposed by the AI and not created yet (AsyncStorage, survives a reload). */
  aiDraftPlanned: 'elearning.ai-draft.planned',
} as const;

/** Content column is capped on wide screens (web / desktop / tablet) and centered. */
export const MAX_CONTENT_WIDTH = 520;
