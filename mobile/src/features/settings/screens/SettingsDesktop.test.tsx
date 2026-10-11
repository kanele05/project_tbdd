import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { getCurrentLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { createTestQueryClient } from '@/test/queryWrapper';
import { renderWithProviders, resetTestPreferences } from '@/test/renderWithProviders';
import type { SessionDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { securityApi } from '../api';
import { SecurityScreen } from './SecurityScreen';
import { SettingsScreen } from './SettingsScreen';
import { TwoFactorSetupScreen } from './TwoFactorSetupScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));
jest.mock('../api', () => ({
  securityApi: {
    overview: jest.fn(),
    sessions: jest.fn(),
    changePassword: jest.fn(),
    revokeSession: jest.fn(),
    revokeOtherSessions: jest.fn(),
    setupTwoFactor: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    regenerateRecoveryCodes: jest.fn(),
  },
}));

const api = jest.mocked(securityApi);
const mockConfirm = confirmAction as jest.Mock;
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });
const setSection = (section?: string) =>
  (useLocalSearchParams as jest.Mock).mockReturnValue(section ? { section } : {});

const THIS_DEVICE: SessionDto = {
  id: 's1',
  deviceName: 'Chrome on Windows',
  ipAddress: '113.161.45.x',
  createdAt: '2026-10-01T08:00:00.000Z',
  lastUsedAt: '2026-10-04T08:00:00.000Z',
  isCurrent: true,
};
const OTHER_DEVICE: SessionDto = {
  ...THIS_DEVICE,
  id: 's2',
  deviceName: 'Pixel 7 · Android 15',
  isCurrent: false,
};

async function renderWithToast(ui: React.ReactElement) {
  return renderWithProviders(<ToastProvider>{ui}</ToastProvider>, {
    client: createTestQueryClient(),
  });
}

describe('Settings on a PC window', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetTestPreferences();
    setWidth(1280);
    setSection();
    mockConfirm.mockResolvedValue(true);
    useAuthStore.setState({
      logout: jest.fn(),
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

  describe('index', () => {
    it('shows the section menu and the appearance choices first', async () => {
      await renderWithToast(<SettingsScreen />);

      expect(screen.getByTestId('settings-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('settings-menu-appearance')).toBeSelected();
      expect(screen.getByTestId('settings-menu-language')).toBeOnTheScreen();
      expect(screen.getByTestId('settings-menu-security')).toBeOnTheScreen();
      expect(screen.getByTestId('settings-menu-about')).toBeOnTheScreen();
      expect(screen.getByTestId('settings-logout')).toBeOnTheScreen();
      expect(screen.getByTestId('theme-system')).toBeOnTheScreen();
    });

    it('changes the appearance and remembers the choice', async () => {
      await renderWithToast(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('theme-dark'));

      await waitFor(() => expect(screen.getByTestId('theme-dark')).toBeSelected());
      expect(usePreferencesStore.getState().themeMode).toBe('dark');
    });

    it('shows the language choices for ?section=language and switches the language', async () => {
      setSection('language');
      await renderWithToast(<SettingsScreen />);

      expect(screen.getByTestId('settings-menu-language')).toBeSelected();
      await fireEvent.press(screen.getByTestId('language-vi'));

      expect(await screen.findByText('Cài đặt')).toBeOnTheScreen();
      expect(getCurrentLanguage()).toBe('vi');
    });

    it('shows the app information and the signed-in email for ?section=about', async () => {
      setSection('about');
      await renderWithToast(<SettingsScreen />);

      expect(screen.getByTestId('settings-panel-about')).toBeOnTheScreen();
      expect(screen.getByText('Version')).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('settings-panel-about')).getByText('rosie@example.com'),
      ).toBeOnTheScreen();
    });

    it('moves between sections and to Security through the menu', async () => {
      await renderWithToast(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-menu-language'));
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/settings',
        params: { section: 'language' },
      });

      await fireEvent.press(screen.getByTestId('settings-menu-security'));
      expect(router.replace).toHaveBeenCalledWith('/settings/security');
    });

    it('logs out after the confirmation from the menu', async () => {
      await renderWithToast(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-logout'));

      await waitFor(() => expect(confirmAction).toHaveBeenCalledTimes(1));
    });

    it('lays the menu out in a row on a tablet', async () => {
      setWidth(900);
      await renderWithToast(<SettingsScreen />);

      expect(screen.getByTestId('settings-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('settings-menu-security')).toBeOnTheScreen();
    });

    it('keeps the phone layout under 768 dp', async () => {
      setWidth(390);
      await renderWithToast(<SettingsScreen />);

      expect(screen.queryByTestId('settings-desktop')).not.toBeOnTheScreen();
      expect(screen.getByTestId('settings-scroll')).toBeOnTheScreen();
    });
  });

  describe('security', () => {
    beforeEach(() => {
      api.overview.mockResolvedValue({
        emailVerified: true,
        twoFactorEnabled: false,
        recoveryCodesRemaining: 0,
      });
      api.sessions.mockResolvedValue([THIS_DEVICE, OTHER_DEVICE]);
    });

    it('lists the devices in a table and logs a device out', async () => {
      api.revokeSession.mockResolvedValue(undefined);
      await renderWithToast(<SecurityScreen />);

      expect(await screen.findByTestId('devices-table')).toBeOnTheScreen();
      expect(screen.getByText('IP address')).toBeOnTheScreen();
      expect(screen.getByText('Chrome on Windows')).toBeOnTheScreen();
      expect(screen.getByText('This device')).toBeOnTheScreen();
      expect(screen.queryByTestId('session-signout-s1')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('session-signout-s2'));

      await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith('s2', expect.anything()));
      expect(screen.getByTestId('settings-menu-security')).toBeSelected();
    });

    it('keeps the device list instead of a table on a tablet', async () => {
      setWidth(900);
      await renderWithToast(<SecurityScreen />);

      expect(await screen.findByTestId('session-s2')).toBeOnTheScreen();
      expect(screen.queryByTestId('devices-table')).not.toBeOnTheScreen();
    });
  });

  describe('two-step setup', () => {
    const SETUP = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/E-Learning:a%40b.co?secret=JBSWY3DPEHPK3PXP&issuer=E-Learning',
    };
    const CODES = Array.from({ length: 10 }, (_, index) => `CCCC${index}-DDDD${index}`);

    it('puts the QR code and the code field in two columns', async () => {
      api.setupTwoFactor.mockResolvedValue(SETUP);
      await renderWithToast(<TwoFactorSetupScreen />);

      expect(await screen.findByTestId('qr-code')).toBeOnTheScreen();
      expect(screen.getByTestId('two-factor-setup-columns')).toBeOnTheScreen();
      expect(screen.getByTestId('two-factor-secret')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
      expect(screen.getByLabelText('Authentication code')).toBeOnTheScreen();
    });

    it('shows the recovery codes in the split panel and goes back once they are saved', async () => {
      api.setupTwoFactor.mockResolvedValue(SETUP);
      api.enableTwoFactor.mockResolvedValue({ recoveryCodes: CODES });
      await renderWithToast(<TwoFactorSetupScreen />);
      await screen.findByTestId('qr-code');

      await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

      expect(await screen.findByTestId('two-factor-recovery-panel')).toBeOnTheScreen();
      expect(screen.getAllByTestId('recovery-code')).toHaveLength(10);
      await fireEvent.press(screen.getByTestId('recovery-saved'));
      expect(router.back).toHaveBeenCalled();
    });
  });
});
