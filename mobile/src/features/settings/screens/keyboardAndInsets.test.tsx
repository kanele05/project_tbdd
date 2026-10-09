import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { createTestQueryClient } from '@/test/queryWrapper';
import { renderWithProviders } from '@/test/renderWithProviders';

import { securityApi } from '../api';
import { SecurityScreen } from './SecurityScreen';
import { SettingsScreen } from './SettingsScreen';
import { TwoFactorSetupScreen } from './TwoFactorSetupScreen';

/**
 * Retest T1: forms deeper in Settings let the keyboard push the fields up (like every other form)
 * and every Settings list ends above the Android navigation bar / home indicator.
 */
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
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
const BOTTOM_INSET = 34;
const XXXL = 32;

async function renderWith(node: React.ReactElement) {
  return renderWithProviders(<ToastProvider>{node}</ToastProvider>, {
    client: createTestQueryClient(),
    insets: { bottom: BOTTOM_INSET },
  });
}

function getContentPaddingBottom(testID: string): number {
  const style = StyleSheet.flatten(screen.getByTestId(testID).props.contentContainerStyle);
  return Number(style.paddingBottom);
}

describe('Settings screens: keyboard and bottom inset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.overview.mockResolvedValue({
      emailVerified: true,
      twoFactorEnabled: false,
      recoveryCodesRemaining: 0,
    });
    api.sessions.mockResolvedValue([]);
    api.setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/E-Learning:a%40b.co?secret=JBSWY3DPEHPK3PXP',
    });
  });

  it('Security: avoids the keyboard and clears the navigation bar', async () => {
    await renderWith(<SecurityScreen />);
    await screen.findByTestId('two-factor-enable');

    expect(screen.getByTestId('security-screen')).toBeOnTheScreen();
    expect(getContentPaddingBottom('security-scroll')).toBe(BOTTOM_INSET + XXXL);
  });

  it('Two-step setup: avoids the keyboard (the code field is at the bottom) and clears the navigation bar', async () => {
    await renderWith(<TwoFactorSetupScreen />);
    await screen.findByTestId('qr-code');

    expect(screen.getByTestId('two-factor-setup-screen')).toBeOnTheScreen();
    expect(getContentPaddingBottom('two-factor-setup-scroll')).toBe(BOTTOM_INSET + XXXL);
  });

  it('Settings: the last row (log out) clears the navigation bar', async () => {
    await renderWith(<SettingsScreen />);

    expect(getContentPaddingBottom('settings-scroll')).toBe(BOTTOM_INSET + XXXL);
  });
});
