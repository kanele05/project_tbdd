import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import * as SystemUI from 'expo-system-ui';
import { Appearance, Platform, Text, View, useColorScheme } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { resetTestPreferences } from '@/test/renderWithProviders';

import { makeStyles } from './makeStyles';
import { darkPalette, lightPalette } from './palettes';
import { DarkThemeScope, ThemeProvider, useTheme } from './ThemeProvider';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const mockUseColorScheme = useColorScheme as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('DarkThemeScope', () => {
  it('provides the dark palette to its subtree even when the app is in light mode', async () => {
    resetTestPreferences();
    mockUseColorScheme.mockReturnValue('light');
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>
          <DarkThemeScope>{children}</DarkThemeScope>
        </ThemeProvider>
      ),
    });
    expect(result.current.colors).toBe(darkPalette);
    expect(result.current.isDark).toBe(true);
    expect(result.current.statusBarStyle).toBe('light');
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    resetTestPreferences();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('falls back to the light palette outside a ThemeProvider', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightPalette);
    expect(result.current.isDark).toBe(false);
    expect(result.current.statusBarStyle).toBe('dark');
  });

  it('follows the device color scheme when the mode is "system"', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result, rerender } = await renderHook(() => useTheme(), { wrapper });
    expect(result.current).toMatchObject({ mode: 'system', isDark: true, statusBarStyle: 'light' });
    expect(result.current.colors).toBe(darkPalette);

    mockUseColorScheme.mockReturnValue('light');
    await rerender({});
    expect(result.current).toMatchObject({ mode: 'system', isDark: false });
    expect(result.current.colors).toBe(lightPalette);
  });

  it('lets an explicit choice override the device scheme', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => result.current.setMode('light'));
    expect(result.current).toMatchObject({ mode: 'light', isDark: false });

    await act(async () => result.current.setMode('dark'));
    expect(result.current).toMatchObject({ mode: 'dark', isDark: true });
    expect(result.current.colors).toBe(darkPalette);
  });

  it('saves the choice to AsyncStorage', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await act(async () => result.current.setMode('dark'));
    await expect(AsyncStorage.getItem(STORAGE_KEYS.themeMode)).resolves.toBe('dark');
  });
});

describe('restoring the saved choice', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetTestPreferences();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('starts in the saved mode once the preferences are hydrated', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'dark');
    const { result } = await renderHook(() => useTheme(), { wrapper });
    expect(result.current.mode).toBe('system');
    expect(result.current.isDark).toBe(false);

    await act(async () => usePreferencesStore.getState().hydrate());

    expect(result.current).toMatchObject({ mode: 'dark', isDark: true, statusBarStyle: 'light' });
    expect(result.current.colors).toBe(darkPalette);
  });

  it('keeps following the device when nothing was saved', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => usePreferencesStore.getState().hydrate());

    expect(result.current).toMatchObject({ mode: 'system', isDark: true });
  });

  it('survives a corrupted saved value', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'purple');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => usePreferencesStore.getState().hydrate());

    expect(result.current.mode).toBe('system');
  });
});

describe('native appearance sync', () => {
  let setColorScheme: jest.SpyInstance;
  const setBackgroundColor = SystemUI.setBackgroundColorAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestPreferences();
    mockUseColorScheme.mockReturnValue('light');
    setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forces the OS scheme to the chosen mode and paints the root view', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
    expect(setBackgroundColor).toHaveBeenLastCalledWith(lightPalette.background);

    await act(async () => result.current.setMode('dark'));
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(setBackgroundColor).toHaveBeenLastCalledWith(darkPalette.background);

    await act(async () => result.current.setMode('light'));
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
    expect(setBackgroundColor).toHaveBeenLastCalledWith(lightPalette.background);
  });

  describe('on the web', () => {
    const style: Record<string, string> = {};

    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'web');
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { documentElement: { style } },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, 'document');
    });

    it('does not touch the native modules', async () => {
      await renderHook(() => useTheme(), { wrapper });
      expect(setColorScheme).not.toHaveBeenCalled();
      expect(setBackgroundColor).not.toHaveBeenCalled();
    });

    it('paints the page and the form controls in the active scheme', async () => {
      const { result } = await renderHook(() => useTheme(), { wrapper });
      expect(style).toMatchObject({
        backgroundColor: lightPalette.background,
        colorScheme: 'light',
      });

      await act(async () => result.current.setMode('dark'));
      expect(style).toMatchObject({ backgroundColor: darkPalette.background, colorScheme: 'dark' });
    });
  });

  it('keeps working when the runtime has no Appearance.setColorScheme', async () => {
    setColorScheme.mockImplementation(() => {
      throw new Error('not supported');
    });
    setBackgroundColor.mockRejectedValueOnce(new Error('no root view'));
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => result.current.setMode('dark'));

    expect(result.current.isDark).toBe(true);
  });
});

describe('makeStyles', () => {
  const useStyles = makeStyles((t) => ({
    box: { backgroundColor: t.colors.card, borderColor: t.colors.border },
  }));

  function Box() {
    const styles = useStyles();
    return (
      <View testID="box" style={styles.box}>
        <Text>box</Text>
      </View>
    );
  }

  beforeEach(() => {
    resetTestPreferences();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('builds the styles from the active palette', async () => {
    await render(<Box />, { wrapper });
    expect(screen.getByTestId('box')).toHaveStyle({
      backgroundColor: lightPalette.card,
      borderColor: lightPalette.border,
    });
  });

  it('rebuilds them when the theme changes', async () => {
    const { result } = await renderHook(() => ({ styles: useStyles(), theme: useTheme() }), {
      wrapper,
    });
    expect(result.current.styles.box).toMatchObject({ backgroundColor: lightPalette.card });

    await act(async () => result.current.theme.setMode('dark'));
    expect(result.current.styles.box).toMatchObject({ backgroundColor: darkPalette.card });
  });

  it('keeps the same style objects between renders while the theme is unchanged', async () => {
    const { result, rerender } = await renderHook(() => useStyles(), { wrapper });
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
  });
});
