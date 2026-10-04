import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/config';
import {
  applyLanguage,
  isLanguagePreference,
  resolveLanguage,
  type LanguagePreference,
} from '@/i18n';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

type PreferencesState = {
  themeMode: ThemeMode;
  language: LanguagePreference;
  /** True once the saved choices were read from AsyncStorage (splash waits for it). */
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (preference: LanguagePreference) => void;
};

function persist(key: string, value: string): void {
  AsyncStorage.setItem(key, value).catch(() => undefined);
}

/**
 * User preferences chosen in Settings: appearance (system/light/dark) and language
 * (system/vi/en). Both are saved in AsyncStorage (not secrets) and re-applied on every launch.
 * Client state only - there is nothing to fetch from the server.
 */
export const usePreferencesStore = create<PreferencesState>()((set) => ({
  themeMode: 'system',
  language: 'system',
  isHydrated: false,

  hydrate: async () => {
    try {
      const [savedMode, savedLanguage] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.themeMode),
        AsyncStorage.getItem(STORAGE_KEYS.language),
      ]);
      const themeMode = isThemeMode(savedMode) ? savedMode : 'system';
      const language = isLanguagePreference(savedLanguage) ? savedLanguage : 'system';
      await applyLanguage(resolveLanguage(language));
      set({ themeMode, language, isHydrated: true });
    } catch {
      // Unreadable storage: keep the defaults (follow the device) and continue.
      set({ isHydrated: true });
    }
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    persist(STORAGE_KEYS.themeMode, mode);
  },

  setLanguage: (preference) => {
    set({ language: preference });
    persist(STORAGE_KEYS.language, preference);
    void applyLanguage(resolveLanguage(preference));
  },
}));
