import { renderHook } from '@testing-library/react-native';

import { renderHookWithProviders } from '@/test/renderWithProviders';

import { useNavigationTheme } from './navigationTheme';
import { darkPalette, lightPalette } from './palettes';

// `expo-router` pulls in ESM-only dependencies Jest cannot load; only its base themes are needed.
jest.mock('expo-router', () => {
  const fonts = { regular: { fontFamily: 'System', fontWeight: '400' } };
  return {
    DefaultTheme: { dark: false, colors: {}, fonts },
    DarkTheme: { dark: true, colors: {}, fonts },
  };
});

describe('useNavigationTheme', () => {
  it('maps the light palette onto the React Navigation theme', async () => {
    const { result } = await renderHookWithProviders(() => useNavigationTheme(), {
      theme: 'light',
    });
    expect(result.current.dark).toBe(false);
    expect(result.current.colors).toMatchObject({
      primary: lightPalette.primary,
      background: lightPalette.background,
      card: lightPalette.card,
      text: lightPalette.text,
      border: lightPalette.border,
      notification: lightPalette.danger,
    });
  });

  it('maps the dark palette (no white flash behind screens in dark mode)', async () => {
    const { result } = await renderHookWithProviders(() => useNavigationTheme(), {
      theme: 'dark',
    });
    expect(result.current.dark).toBe(true);
    expect(result.current.colors.background).toBe(darkPalette.background);
    expect(result.current.colors.card).toBe(darkPalette.card);
    expect(result.current.colors.text).toBe(darkPalette.text);
  });

  it('keeps the navigation fonts of the base theme', async () => {
    const { result } = await renderHook(() => useNavigationTheme());
    expect(result.current.fonts).toBeDefined();
  });

  it('returns the same object while the theme does not change', async () => {
    const { result, rerender } = await renderHookWithProviders(() => useNavigationTheme());
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
  });
});
