import { create } from 'zustand';

import { authApi } from '@/features/auth/api';
import { setAccessToken, setUnauthorizedHandler } from '@/lib/apiClient';
import { isAppError } from '@/lib/appError';
import { clearPersistedCache } from '@/lib/persister';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { tokenStorage } from '@/lib/secureStorage';
import type { UserDto } from '@/types/api';

import { useSearchFilterStore } from './searchFilterStore';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  token: string | null;
  user: UserDto | null;
  status: AuthStatus;
  /** True when the last logout was forced by an expired/invalid token (login screen can tell). */
  sessionExpired: boolean;
  /**
   * SC-01 bootstrap: read the token from SecureStore, then validate it with `GET /auth/me`.
   * Offline with a cached user => stay logged in; 401 => clear the token.
   */
  hydrate: () => Promise<void>;
  /** Save a session returned by login/register. */
  login: (token: string, user: UserDto) => Promise<void>;
  /** Update the current user (after `PATCH /me`, avatar upload...). */
  setUser: (user: UserDto) => void;
  /** Clear token, user, all query caches (memory + persisted) and temporary filters. */
  logout: (options?: { expired?: boolean }) => Promise<void>;
};

let hydratePromise: Promise<void> | null = null;

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
      const token = await tokenStorage.get();
      if (!token) {
        set({ token: null, user: null, status: 'unauthenticated' });
        return;
      }
      setAccessToken(token);
      try {
        const user = await authApi.meForBootstrap();
        queryClient.setQueryData(queryKeys.me(), user);
        set({ token, user, status: 'authenticated', sessionExpired: false });
      } catch (error) {
        if (isAppError(error) && error.status === 401) {
          setAccessToken(null);
          await tokenStorage.clear();
          set({ token: null, user: null, status: 'unauthenticated' });
          return;
        }
        // No network / server down: keep the session if we have a persisted user profile.
        const cachedUser = queryClient.getQueryData<UserDto>(queryKeys.me());
        if (cachedUser) {
          set({ token, user: cachedUser, status: 'authenticated' });
        } else {
          setAccessToken(null);
          set({ token: null, user: null, status: 'unauthenticated' });
        }
      }
    })().finally(() => {
      hydratePromise = null;
    });
    return hydratePromise;
  },

  login: async (token, user) => {
    setAccessToken(token);
    await tokenStorage.set(token);
    queryClient.setQueryData(queryKeys.me(), user);
    set({ token, user, status: 'authenticated', sessionExpired: false });
  },

  setUser: (user) => {
    queryClient.setQueryData(queryKeys.me(), user);
    set({ user });
  },

  logout: async (options) => {
    if (get().status === 'unauthenticated' && !get().token) return;
    // Update state first so the auth guard redirects to Login immediately.
    setAccessToken(null);
    set({
      token: null,
      user: null,
      status: 'unauthenticated',
      sessionExpired: options?.expired === true,
    });
    await queryClient.cancelQueries();
    queryClient.clear();
    useSearchFilterStore.getState().reset();
    await Promise.all([tokenStorage.clear(), clearPersistedCache()]);
  },
}));

// A 401 on an authenticated request means the token is invalid/expired => log out.
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status === 'authenticated') {
    void useAuthStore.getState().logout({ expired: true });
  }
});

/** `true` when a valid session exists (used by the route guard). */
export const selectIsLoggedIn = (state: AuthState): boolean => state.status === 'authenticated';
