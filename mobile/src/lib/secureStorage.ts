import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '@/constants/config';

/**
 * Thin wrapper around expo-secure-store for the auth token (CLAUDE.md §7: the token is stored in
 * SecureStore, never AsyncStorage). Failures (e.g. unsupported platform) never throw: reads return
 * `null` so the app simply behaves as logged out.
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (!(await isSecureStoreAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (!(await isSecureStoreAvailable())) return;
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
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
