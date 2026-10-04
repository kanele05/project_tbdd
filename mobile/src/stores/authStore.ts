import { create } from 'zustand';

import { authApi } from '@/features/auth/api';
import {
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  setAuthTokens,
  setTokensRefreshedHandler,
  setUnauthorizedHandler,
} from '@/lib/apiClient';
import { isAppError } from '@/lib/appError';
import { clearPersistedCache } from '@/lib/persister';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { tokenStorage } from '@/lib/secureStorage';
import type { AuthSessionDto, UserDto } from '@/types/api';

import { useSearchFilterStore } from './searchFilterStore';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/** What a successful login / verification gives us (a subset of `AuthSessionDto`). */
export type LoginSession = Pick<AuthSessionDto, 'accessToken' | 'refreshToken' | 'user'>;

type AuthState = {
  /** Current access token (mirror of what `apiClient` sends; the refresh token stays in storage). */
  token: string | null;
  user: UserDto | null;
  status: AuthStatus;
  /** True when the last logout was forced by an expired/refused session (login screen can tell). */
  sessionExpired: boolean;
  /**
   * SC-01 bootstrap: read the tokens from SecureStore, then validate them with `GET /auth/me`
   * (an expired access token is refreshed transparently). Offline with a cached user => stay
   * logged in; a refused session => clear the tokens.
   */
  hydrate: () => Promise<void>;
  /** Save a session returned by login / email verification / 2FA. */
  login: (session: LoginSession) => Promise<void>;
  /** Update the current user (after `PATCH /me`, avatar upload...). */
  setUser: (user: UserDto) => void;
  /**
   * Revoke the session on the server (best effort, skipped when forced), then clear tokens, user,
   * all query caches (memory + persisted) and temporary filters.
   */
  logout: (options?: { expired?: boolean }) => Promise<void>;
};

let hydratePromise: Promise<void> | null = null;

/** The server refused the tokens (as opposed to "no network"): the stored session is dead. */
function isSessionRefused(error: unknown): boolean {
  return (
    isAppError(error) && (error.status === 401 || error.status === 400 || error.status === 403)
  );
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  status: 'idle',
  sessionExpired: false,

  hydrate: () => {
    // Guard against double invocation (React strict mode / fast refresh).
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      set({ status: 'loading' });
      const stored = await tokenStorage.get();
      if (!stored.accessToken && !stored.refreshToken) {
        set({ token: null, user: null, status: 'unauthenticated' });
        return;
      }
      setAuthTokens(stored);
      try {
        // Access token lost but refresh token kept: get a new one before asking for the profile.
        if (!stored.accessToken) await refreshAccessToken();
        const user = await authApi.meForBootstrap();
        queryClient.setQueryData(queryKeys.me(), user);
        set({ token: getAccessToken(), user, status: 'authenticated', sessionExpired: false });
      } catch (error) {
        if (isSessionRefused(error)) {
          setAuthTokens(null);
          await tokenStorage.clear();
          set({ token: null, user: null, status: 'unauthenticated' });
          return;
        }
        // No network / server down: keep the session if we have a persisted user profile.
        const cachedUser = queryClient.getQueryData<UserDto>(queryKeys.me());
        if (cachedUser) {
          set({ token: getAccessToken(), user: cachedUser, status: 'authenticated' });
        } else {
          setAuthTokens(null);
          set({ token: null, user: null, status: 'unauthenticated' });
        }
      }
    })().finally(() => {
      hydratePromise = null;
    });
    return hydratePromise;
  },

  login: async ({ accessToken, refreshToken, user }) => {
    setAuthTokens({ accessToken, refreshToken });
    await tokenStorage.set({ accessToken, refreshToken });
    queryClient.setQueryData(queryKeys.me(), user);
    set({ token: accessToken, user, status: 'authenticated', sessionExpired: false });
  },

  setUser: (user) => {
    queryClient.setQueryData(queryKeys.me(), user);
    set({ user });
  },

  logout: async (options) => {
    if (get().status === 'unauthenticated' && !get().token) return;
    const refreshToken = getRefreshToken();
    // Update state first so the auth guard redirects to Login immediately.
    setAuthTokens(null);
    set({
      token: null,
      user: null,
      status: 'unauthenticated',
      sessionExpired: options?.expired === true,
    });
    // A forced logout means the server already ended the session; otherwise tell it (ignore failures).
    const revoke =
      options?.expired === true || !refreshToken
        ? Promise.resolve()
        : authApi.logout(refreshToken).catch(() => undefined);
    await queryClient.cancelQueries();
    queryClient.clear();
    useSearchFilterStore.getState().reset();
    await Promise.all([tokenStorage.clear(), clearPersistedCache(), revoke]);
  },
}));

// The refresh token is single use: every rotated pair must be saved, or the next launch is logged out.
setTokensRefreshedHandler(async (tokens) => {
  useAuthStore.setState({ token: tokens.accessToken });
  await tokenStorage.set(tokens);
  // The user logged out while we were saving: do not resurrect the session.
  if (getRefreshToken() !== tokens.refreshToken) await tokenStorage.clear();
});

// A refused refresh token (or a 401 that cannot be refreshed) means the session is over => log out.
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status === 'authenticated') {
    void useAuthStore.getState().logout({ expired: true });
  }
});

/** `true` when a valid session exists (used by the route guard). */
export const selectIsLoggedIn = (state: AuthState): boolean => state.status === 'authenticated';
