import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { usePreferencesStore, type ThemeMode } from '@/stores/preferencesStore';

import { darkPalette, lightPalette, type Palette } from './palettes';

export type { ThemeMode } from '@/stores/preferencesStore';

export type Theme = {
  /** Semantic colors of the active palette. */
  colors: Palette;
  isDark: boolean;
  /** The user's choice: `system` follows the device. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** `expo-status-bar` style that stays readable on `colors.background`. */
  statusBarStyle: 'light' | 'dark';
};

function setStoredMode(mode: ThemeMode): void {
  usePreferencesStore.getState().setThemeMode(mode);
}

/** Used when a component renders outside `ThemeProvider` (isolated tests): the light palette. */
const FALLBACK_THEME: Theme = {
  colors: lightPalette,
  isDark: false,
  mode: 'light',
  setMode: setStoredMode,
  statusBarStyle: 'dark',
};

const ThemeContext = createContext<Theme>(FALLBACK_THEME);

/**
 * Keep native chrome in step with the choice: dialogs / keyboard follow the forced scheme
 * (`Appearance.setColorScheme`) and the root view gets the screen color (no white flash).
 */
function syncNativeAppearance(mode: ThemeMode, backgroundColor: string): void {
  try {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  } catch {
    // Older runtimes without setColorScheme: the JS theme still works.
  }
  SystemUI.setBackgroundColorAsync(backgroundColor).catch(() => undefined);
}

/** Web: paint the page behind the app (overscroll, resize) and switch native form controls / scrollbars. */
function syncWebAppearance(isDark: boolean, backgroundColor: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = backgroundColor;
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

/**
 * Provides the active palette. Mount once at the root (above the navigator). The choice lives in
 * `preferencesStore` (persisted); when it is `system` the palette follows `useColorScheme()`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = usePreferencesStore((state) => state.themeMode);
  const scheme = useColorScheme();
  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';

  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkPalette : lightPalette,
      isDark,
      mode,
      setMode: setStoredMode,
      statusBarStyle: isDark ? 'light' : 'dark',
    }),
    [isDark, mode],
  );

  useEffect(() => {
    if (Platform.OS === 'web') syncWebAppearance(isDark, value.colors.background);
    else syncNativeAppearance(mode, value.colors.background);
  }, [mode, isDark, value.colors.background]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Re-provides the dark palette to a subtree that always sits on a black surface (the full-screen
 * video modal), so text, buttons and links stay readable when the app itself is in light mode.
 */
export function DarkThemeScope({ children }: { children: ReactNode }) {
  const parent = useContext(ThemeContext);
  const value = useMemo<Theme>(
    () => ({ ...parent, colors: darkPalette, isDark: true, statusBarStyle: 'light' }),
    [parent],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** `const { colors, isDark, mode, setMode } = useTheme()`. Re-renders when the theme changes. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
