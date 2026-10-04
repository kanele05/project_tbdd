import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS } from '@/constants/config';
import { getCurrentLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { renderWithProviders, resetTestPreferences } from '@/test/renderWithProviders';
import { confirmAction } from '@/utils/confirmAction';

import { SettingsScreen } from './SettingsScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockConfirm = confirmAction as jest.Mock;
const mockLogout = jest.fn();

describe('SettingsScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetTestPreferences();
    useAuthStore.setState({
      logout: mockLogout,
      user: {
        id: 'u1',
        email: 'rosie@example.com',
        fullName: 'Martha Rosie',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
    });
  });

  it('lists the language and appearance choices with the current ones selected', async () => {
    await renderWithProviders(<SettingsScreen />, { theme: 'dark', language: 'en' });

    expect(screen.getByText('Settings')).toBeOnTheScreen();
    expect(screen.getByTestId('theme-dark')).toBeSelected();
    expect(screen.getByTestId('theme-light')).not.toBeSelected();
    expect(screen.getByTestId('language-en')).toBeSelected();
    expect(screen.getByTestId('language-vi')).not.toBeSelected();
    expect(screen.getByText('Tiếng Việt')).toBeOnTheScreen();
    expect(screen.getByText('English')).toBeOnTheScreen();
  });

  it('switches the whole screen to Vietnamese and remembers the choice', async () => {
    await renderWithProviders(<SettingsScreen />);

    await fireEvent.press(screen.getByTestId('language-vi'));

    expect(await screen.findByText('Cài đặt')).toBeOnTheScreen();
    expect(screen.getByText('Giao diện')).toBeOnTheScreen();
    expect(screen.getByTestId('language-vi')).toBeSelected();
    expect(getCurrentLanguage()).toBe('vi');
    await expect(AsyncStorage.getItem(STORAGE_KEYS.language)).resolves.toBe('vi');
  });

  it('changes the appearance and remembers the choice', async () => {
    await renderWithProviders(<SettingsScreen />);

    await fireEvent.press(screen.getByTestId('theme-dark'));

    await waitFor(() => expect(screen.getByTestId('theme-dark')).toBeSelected());
    expect(usePreferencesStore.getState().themeMode).toBe('dark');
    await expect(AsyncStorage.getItem(STORAGE_KEYS.themeMode)).resolves.toBe('dark');
  });

  it('shows the app version and the signed-in account', async () => {
    await renderWithProviders(<SettingsScreen />);

    expect(screen.getByText('Version')).toBeOnTheScreen();
    expect(screen.getByText('rosie@example.com')).toBeOnTheScreen();
  });

  it('logs out only after the user confirms', async () => {
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderWithProviders(<SettingsScreen />);

    await fireEvent.press(screen.getByTestId('settings-logout'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockLogout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('settings-logout'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Log out', isDestructive: true }),
    );
  });
});
