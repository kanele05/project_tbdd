import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';

/**
 * Thin wrapper around expo-secure-store for the auth token (CLAUDE.md §7: the token is stored in
 * SecureStore, never AsyncStorage). Failures (e.g. unsupported platform) never throw: reads return
 * `null` so the app simply behaves as logged out.
 *
 * WEB (PLT-01): SecureStore does not exist in the browser, so the token falls back to
 * `localStorage`. Security trade-off: any script running on the same origin (e.g. through an XSS
 * bug or a compromised dependency) can read it, unlike the native Keychain/Keystore. Accepted for
 * this course project because the token is a 7-day JWT with no payment data behind it and the web
 * build only runs on our own origin; a hardened production setup would use an httpOnly,
 * SameSite cookie issued by the API instead. Never put anything more sensitive than that token here.
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

export const tokenStorage = {
  get: () => getSecureItem(STORAGE_KEYS.authToken),
  set: (token: string) => setSecureItem(STORAGE_KEYS.authToken, token),
  clear: () => deleteSecureItem(STORAGE_KEYS.authToken),
};
