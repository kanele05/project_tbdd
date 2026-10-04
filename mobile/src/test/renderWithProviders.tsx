import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider, type EdgeInsets } from 'react-native-safe-area-context';

import { applyLanguage, type AppLanguage } from '@/i18n';
import { usePreferencesStore, type ThemeMode } from '@/stores/preferencesStore';
import { ThemeProvider } from '@/theme';

/**
 * Shared test wrapper (UI-02 / UI-03): SafeAreaProvider + ThemeProvider + i18n (+ an optional
 * QueryClient), i.e. the same stack as `app/_layout.tsx`.
 *
 * Tests run in English / light by default so text assertions stay stable. Pass `language: 'vi'`
 * or `theme: 'dark'` to test the other variants; `jest.setup.ts` resets the language after every
 * test, and `resetTestPreferences()` resets the theme. To test the `system` theme mode, mock
 * `react-native/Libraries/Utilities/useColorScheme` in the test file (see `ThemeProvider.test.tsx`).
 */
export type ProviderOptions = {
  /** Theme choice stored in the preferences store. Default `light`. */
  theme?: ThemeMode;
  /** UI language. Default `en`. */
  language?: AppLanguage;
  /** Wrap in a `QueryClientProvider` too. */
  client?: QueryClient;
  /** Safe-area insets the screen sees (notch / home indicator). Default: all 0. */
  insets?: Partial<EdgeInsets>;
};

const WINDOW = { width: 390, height: 844 };

/** Set the stored theme + language (and switch i18next) before rendering. */
export async function setTestPreferences({
  theme = 'light',
  language = 'en',
}: Pick<ProviderOptions, 'theme' | 'language'> = {}): Promise<void> {
  usePreferencesStore.setState({ themeMode: theme, language });
  await applyLanguage(language);
}

/** Back to the app defaults (theme `system`, language `system`). */
export function resetTestPreferences(): void {
  usePreferencesStore.setState({ themeMode: 'system', language: 'system', isHydrated: false });
}

export function createProvidersWrapper({
  client,
  insets,
}: Pick<ProviderOptions, 'client' | 'insets'> = {}) {
  const metrics = {
    frame: { x: 0, y: 0, ...WINDOW },
    insets: { top: 0, right: 0, bottom: 0, left: 0, ...insets },
  };
  return function ProvidersWrapper({ children }: { children: ReactNode }) {
    const content = (
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    );
    return client ? <QueryClientProvider client={client}>{content}</QueryClientProvider> : content;
  };
}

/** `render` inside the app providers. Same async API as RNTL 14's `render`. */
export async function renderWithProviders(
  ui: ReactElement,
  {
    theme,
    language,
    client,
    insets,
    ...options
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  await setTestPreferences({ theme, language });
  return render(ui, { ...options, wrapper: createProvidersWrapper({ client, insets }) });
}

/** `renderHook` inside the app providers (hooks that call `useTheme` / `useTranslation`...). */
export async function renderHookWithProviders<Result, Props>(
  callback: (props: Props) => Result,
  {
    theme,
    language,
    client,
    insets,
    ...options
  }: ProviderOptions & Omit<RenderHookOptions<Props>, 'wrapper'> = {},
) {
  await setTestPreferences({ theme, language });
  return renderHook(callback, { ...options, wrapper: createProvidersWrapper({ client, insets }) });
}
