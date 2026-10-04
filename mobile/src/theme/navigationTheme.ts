import { DarkTheme, DefaultTheme } from 'expo-router';
import { useMemo } from 'react';

import { useTheme } from './ThemeProvider';

/**
 * React Navigation theme built from the active palette (screen background behind transitions,
 * header / tab-bar defaults). Pass it to `ThemeProvider` from `expo-router` in the root layout.
 * Not re-exported from `@/theme` so that importing the theme never pulls in `expo-router`.
 */
export function useNavigationTheme(): typeof DefaultTheme {
  const { colors, isDark } = useTheme();
  return useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, isDark]);
}
