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

/** Storage keys. The token goes to SecureStore only; everything else to AsyncStorage. */
export const STORAGE_KEYS = {
  authToken: 'elearning.auth.token',
  queryCache: 'elearning.query-cache',
  recentSearches: 'elearning.recent-searches',
  /** `system | light | dark` (AsyncStorage). */
  themeMode: 'elearning.pref.theme-mode',
  /** `system | vi | en` (AsyncStorage). */
  language: 'elearning.pref.language',
} as const;

/** Content column is capped on wide screens (web / desktop / tablet) and centered. */
export const MAX_CONTENT_WIDTH = 520;
