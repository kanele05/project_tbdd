import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';

/**
 * Thin wrapper around expo-secure-store for the auth tokens (CLAUDE.md §7: tokens are stored in
 * SecureStore, never AsyncStorage). Failures (e.g. unsupported platform) never throw: reads return
 * `null` so the app simply behaves as logged out.
 *
 * WEB (PLT-01): SecureStore does not exist in the browser, so the token falls back to
 * `localStorage`. Security trade-off: any script running on the same origin (e.g. through an XSS
 * bug or a compromised dependency) can read them, unlike the native Keychain/Keystore. Accepted for
 * this course project because the access token lives 15 minutes, the refresh token rotates on every
 * use (a stolen copy is revoked as soon as the real client refreshes) and no payment data sits
 * behind them; the web build only runs on our own origin. A hardened production setup would use
 * an httpOnly, SameSite cookie issued by the API instead. Never put anything more sensitive than
 * these two tokens here.
 */

function getWebStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access to localStorage can throw (blocked cookies, private mode in some browsers).
    return null;
  }
}

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return getWebStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  if (!(await isSecureStoreAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      getWebStorage()?.setItem(key, value);
    } catch {
      // Quota exceeded / storage blocked: the user simply has to log in again next time.
    }
    return;
  }
  if (!(await isSecureStoreAvailable())) return;
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      getWebStorage()?.removeItem(key);
    } catch {
      // Nothing to remove.
    }
    return;
  }
  if (!(await isSecureStoreAvailable())) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Nothing to delete / store unavailable - treat as already removed.
  }
}

export type StoredTokens = { accessToken: string | null; refreshToken: string | null };

/** The two session tokens (access + refresh). Each lives under its own key. */
export const tokenStorage = {
  get: async (): Promise<StoredTokens> => {
    const [accessToken, refreshToken] = await Promise.all([
      getSecureItem(STORAGE_KEYS.authToken),
      getSecureItem(STORAGE_KEYS.authRefreshToken),
    ]);
    return { accessToken, refreshToken };
  },
  set: async (tokens: { accessToken: string; refreshToken: string }): Promise<void> => {
    await Promise.all([
      setSecureItem(STORAGE_KEYS.authToken, tokens.accessToken),
      setSecureItem(STORAGE_KEYS.authRefreshToken, tokens.refreshToken),
    ]);
  },
  clear: async (): Promise<void> => {
    await Promise.all([
      deleteSecureItem(STORAGE_KEYS.authToken),
      deleteSecureItem(STORAGE_KEYS.authRefreshToken),
    ]);
  },
};
