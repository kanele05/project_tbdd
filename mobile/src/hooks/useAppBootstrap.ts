import { useIsRestoring } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/authStore';

/** Upper bound for the splash: never keep the user staring at it if something hangs. */
const MAX_SPLASH_MS = 12_000;

/**
 * SC-01 bootstrap. Keeps the native splash visible until:
 *  1. fonts are loaded (or failed - system fonts are used then),
 *  2. the persisted query cache is restored (needed for the offline start),
 *  3. the auth token was read from SecureStore and validated via `GET /auth/me`.
 * Must be called below `PersistQueryClientProvider`. Returns `true` when the navigator can render.
 */
export function useAppBootstrap(fontsReady: boolean): boolean {
  const isRestoring = useIsRestoring();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isRestoring && status === 'idle') void hydrate();
  }, [isRestoring, status, hydrate]);

  useEffect(() => {
    const timer = setTimeout(() => setIsTimedOut(true), MAX_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const isAuthResolved = status === 'authenticated' || status === 'unauthenticated';
  const isReady = isTimedOut || (fontsReady && !isRestoring && isAuthResolved);

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  return isReady;
}
