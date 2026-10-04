import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import { getCurrentLanguage } from '@/i18n';
import { resetTestPreferences } from '@/test/renderWithProviders';

import { usePreferencesStore } from './preferencesStore';

describe('preferencesStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetTestPreferences();
  });

  it('defaults to following the device for both theme and language', () => {
    expect(usePreferencesStore.getState()).toMatchObject({
      themeMode: 'system',
      language: 'system',
      isHydrated: false,
    });
  });

  it('restores the saved theme and language on hydrate', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'dark');
    await AsyncStorage.setItem(STORAGE_KEYS.language, 'vi');

    await usePreferencesStore.getState().hydrate();

    expect(usePreferencesStore.getState()).toMatchObject({
      themeMode: 'dark',
      language: 'vi',
      isHydrated: true,
    });
    expect(getCurrentLanguage()).toBe('vi');
  });

  it('ignores garbage in storage', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'sepia');
    await AsyncStorage.setItem(STORAGE_KEYS.language, 'fr');

    await usePreferencesStore.getState().hydrate();

    expect(usePreferencesStore.getState()).toMatchObject({
      themeMode: 'system',
      language: 'system',
      isHydrated: true,
    });
    expect(getCurrentLanguage()).toBe('en');
  });

  it('still finishes hydrating when storage cannot be read', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk error'));

    await usePreferencesStore.getState().hydrate();

    expect(usePreferencesStore.getState().isHydrated).toBe(true);
  });

  it('saves the theme mode when it changes', async () => {
    usePreferencesStore.getState().setThemeMode('light');

    expect(usePreferencesStore.getState().themeMode).toBe('light');
    await expect(AsyncStorage.getItem(STORAGE_KEYS.themeMode)).resolves.toBe('light');
  });

  it('saves the language and switches the UI right away', async () => {
    usePreferencesStore.getState().setLanguage('vi');
    expect(usePreferencesStore.getState().language).toBe('vi');
    await expect(AsyncStorage.getItem(STORAGE_KEYS.language)).resolves.toBe('vi');
    await Promise.resolve();
    expect(getCurrentLanguage()).toBe('vi');

    usePreferencesStore.getState().setLanguage('system');
    await Promise.resolve();
    // The mocked device language is English.
    expect(getCurrentLanguage()).toBe('en');
  });
});
