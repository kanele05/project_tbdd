import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { CACHE_MAX_AGE_MS } from '@/constants/config';

import { isAppError } from './appError';

const MAX_RETRIES = 2;

/**
 * The app-wide QueryClient (PLAN.md §10).
 * - `gcTime` = 24 h (>= persister `maxAge`, otherwise restored queries are garbage collected).
 * - Per-query `staleTime` comes from `STALE_TIME` in `constants/config.ts`, set in each hook.
 * - 4xx errors are never retried (they will not fix themselves); network/5xx retry twice.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE_MS,
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        if (isAppError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < MAX_RETRIES;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: false },
  },
});

let isEnvironmentReady = false;

/**
 * Wire TanStack Query to React Native (idempotent):
 * - `onlineManager` <- NetInfo: offline pauses queries, mutations are rejected by `apiClient`.
 * - `focusManager` <- AppState: refetch stale queries when the app returns to the foreground.
 */
export function setupQueryEnvironment(): void {
  if (isEnvironmentReady) return;
  isEnvironmentReady = true;

  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
  });

  if (Platform.OS !== 'web') {
    focusManager.setEventListener((handleFocus) => {
      const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
        handleFocus(status === 'active');
      });
      return () => subscription.remove();
    });
  }
}
