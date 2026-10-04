import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { MAX_RECENT_SEARCHES, STORAGE_KEYS } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';

/**
 * Put `keyword` first in the history: trimmed, de-duplicated without regard to case, capped at
 * `MAX_RECENT_SEARCHES`. A blank keyword leaves the list unchanged.
 */
export function addRecentKeyword(list: readonly string[], keyword: string): string[] {
  const trimmed = keyword.trim();
  if (trimmed === '') return [...list];
  const lower = trimmed.toLowerCase();
  const others = list.filter((item) => item.toLowerCase() !== lower);
  return [trimmed, ...others].slice(0, MAX_RECENT_SEARCHES);
}

function dedupe(list: readonly string[]): string[] {
  const seen = new Set<string>();
  return list.filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

type RecentSearchesState = {
  /** Newest first. */
  keywords: string[];
  isHydrated: boolean;
  /** Read the saved history from AsyncStorage (once). */
  hydrate: () => Promise<void>;
  add: (keyword: string) => void;
  remove: (keyword: string) => void;
  clear: () => void;
};

function save(keywords: readonly string[]): void {
  AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(keywords)).catch(
    () => undefined,
  );
}

let hydratePromise: Promise<void> | null = null;

/**
 * Recent searches of the Search tab (SC-05, up to 10). Client state only, kept in AsyncStorage on
 * this device (not a secret) and cleared when the user signs out.
 */
export const useRecentSearches = create<RecentSearchesState>()((set, get) => ({
  keywords: [],
  isHydrated: false,

  hydrate: () => {
    hydratePromise ??= (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentSearches);
        const saved: unknown = raw ? JSON.parse(raw) : [];
        const keywords = isStringList(saved) ? dedupe(saved).slice(0, MAX_RECENT_SEARCHES) : [];
        set({ keywords, isHydrated: true });
      } catch {
        // Unreadable storage: start with an empty history.
        set({ isHydrated: true });
      }
    })();
    return hydratePromise;
  },

  add: (keyword) => {
    // Writing before the saved list is read would overwrite it: wait for the read first.
    if (!get().isHydrated) {
      void get()
        .hydrate()
        .then(() => get().add(keyword));
      return;
    }
    const keywords = addRecentKeyword(get().keywords, keyword);
    set({ keywords });
    save(keywords);
  },

  remove: (keyword) => {
    const keywords = get().keywords.filter((item) => item !== keyword);
    set({ keywords });
    save(keywords);
  },

  clear: () => {
    set({ keywords: [] });
    save([]);
  },
}));

/** Test helper: empty the history and the saved copy, and forget the "already read" flag. */
export async function resetRecentSearchesForTest(): Promise<void> {
  hydratePromise = null;
  useRecentSearches.setState({ keywords: [], isHydrated: false });
  await AsyncStorage.removeItem(STORAGE_KEYS.recentSearches);
}

// Another person can sign in on the same device: do not leak the previous history.
useAuthStore.subscribe((state, previous) => {
  if (previous.user && !state.user) useRecentSearches.getState().clear();
});
