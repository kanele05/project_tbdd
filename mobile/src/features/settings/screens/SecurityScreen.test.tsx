import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { createTestQueryClient } from '@/test/queryWrapper';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { SessionDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { securityApi } from '../api';
import { SecurityScreen } from './SecurityScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href), back: jest.fn(), canGoBack: () => true },
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

const THIS_DEVICE: SessionDto = {
  id: 's1',
  deviceName: 'Pixel 7 · Android 15',
  ipAddress: '113.161.45.x',
  createdAt: '2026-10-01T08:00:00.000Z',
  lastUsedAt: '2026-10-04T08:00:00.000Z',
  isCurrent: true,
};
const OTHER_DEVICE: SessionDto = {
  ...THIS_DEVICE,
  id: 's2',
  deviceName: 'Edge on Windows',
  isCurrent: false,
};

async function renderScreen() {
  return renderWithProviders(
    <ToastProvider>
      <SecurityScreen />
    </ToastProvider>,
    { client: createTestQueryClient() },
  );
}

function setup(overview: { twoFactorEnabled: boolean; recoveryCodesRemaining: number }) {
  api.overview.mockResolvedValue({ emailVerified: true, ...overview });
  api.sessions.mockResolvedValue([THIS_DEVICE, OTHER_DEVICE]);
}

describe('SecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  describe('two-step verification', () => {
    it('offers to turn it on when it is off and opens the setup screen', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('two-factor-enable'));

      expect(mockPush).toHaveBeenCalledWith('/settings/two-factor');
    });

    it('shows the status and the recovery codes left when it is on', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 9 });
      await renderScreen();

      expect(await screen.findByText('On')).toBeOnTheScreen();
      expect(screen.getByTestId('recovery-remaining')).toHaveTextContent('9 recovery codes left');
    });

    it('warns when only a few recovery codes are left', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 2 });
      await renderScreen();

      expect(await screen.findByText(/You are running low/)).toBeOnTheScreen();
    });

    it('turns it off with the password and an authenticator code', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 9 });
      api.disableTwoFactor.mockResolvedValue(undefined);
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('two-factor-disable'));
      expect(screen.getByTestId('second-factor-confirm')).toBeDisabled();
      await fireEvent.changeText(screen.getByTestId('second-factor-password'), 'abc12345');
      await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');
      await fireEvent.press(screen.getByTestId('second-factor-confirm'));

      await waitFor(() =>
        expect(api.disableTwoFactor).toHaveBeenCalledWith(
          {
            password: 'abc12345',
            code: '123456',
          },
          expect.anything(),
        ),
      );
      expect(await screen.findByText('Two-step verification is off.')).toBeOnTheScreen();
    });

    it('turns it off with a recovery code instead', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 9 });
      api.disableTwoFactor.mockResolvedValue(undefined);
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('two-factor-disable'));
      await fireEvent.changeText(screen.getByTestId('second-factor-password'), 'abc12345');
      await fireEvent.press(screen.getByTestId('second-factor-switch'));
      await fireEvent.changeText(screen.getByTestId('second-factor-recovery'), 'abcde fghjk');
      await fireEvent.press(screen.getByTestId('second-factor-confirm'));

      await waitFor(() =>
        expect(api.disableTwoFactor).toHaveBeenCalledWith(
          {
            password: 'abc12345',
            recoveryCode: 'ABCDE-FGHJK',
          },
          expect.anything(),
        ),
      );
    });

    it('shows the server error when the password is wrong', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 9 });
      api.disableTwoFactor.mockRejectedValue(
        new AppError({ status: 422, code: 'INVALID_PASSWORD', message: 'Wrong password' }),
      );
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('two-factor-disable'));
      await fireEvent.changeText(screen.getByTestId('second-factor-password'), 'nope1234');
      await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');
      await fireEvent.press(screen.getByTestId('second-factor-confirm'));

      expect(await screen.findByText('The current password is incorrect.')).toBeOnTheScreen();
    });

    it('creates new recovery codes, shows them once and hides them after "I saved"', async () => {
      setup({ twoFactorEnabled: true, recoveryCodesRemaining: 1 });
      const codes = Array.from({ length: 10 }, (_, index) => `AAAA${index}-BBBB${index}`);
      api.regenerateRecoveryCodes.mockResolvedValue({ recoveryCodes: codes });
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('two-factor-regenerate'));
      await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');
      await fireEvent.press(screen.getByTestId('second-factor-confirm'));

      await waitFor(() =>
        expect(api.regenerateRecoveryCodes).toHaveBeenCalledWith(
          { code: '123456' },
          expect.anything(),
        ),
      );
      expect(await screen.findByText('AAAA0-BBBB0')).toBeOnTheScreen();
      expect(screen.getAllByTestId('recovery-code')).toHaveLength(10);

      await fireEvent.press(screen.getByTestId('recovery-saved'));
      expect(screen.queryByTestId('recovery-codes')).not.toBeOnTheScreen();
    });
  });

  describe('change password', () => {
    async function openForm() {
      await fireEvent.press(await screen.findByTestId('change-password-open'));
    }
    async function fill(current = 'abc12345', next = 'newpass123', confirm = 'newpass123') {
      await fireEvent.changeText(screen.getByLabelText('Current password'), current);
      await fireEvent.changeText(screen.getByLabelText('New password'), next);
      await fireEvent.changeText(screen.getByLabelText('Confirm new password'), confirm);
      await fireEvent.press(screen.getByTestId('change-password-submit'));
    }

    it('validates the new password before calling the server', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      await renderScreen();
      await openForm();

      await fill('abc12345', 'abc12345', 'abc12345');

      expect(
        await screen.findByText('The new password must be different from the current one'),
      ).toBeOnTheScreen();
      expect(api.changePassword).not.toHaveBeenCalled();
    });

    it('changes the password and says the other devices were logged out', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.changePassword.mockResolvedValue(undefined);
      await renderScreen();
      await openForm();

      await fill();

      await waitFor(() =>
        expect(api.changePassword).toHaveBeenCalledWith(
          {
            currentPassword: 'abc12345',
            newPassword: 'newpass123',
          },
          expect.anything(),
        ),
      );
      expect(
        await screen.findByText('Password updated. Your other devices were logged out.'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('change-password-submit')).not.toBeOnTheScreen();
      // The device list is refreshed: the other devices are gone.
      await waitFor(() => expect(api.sessions.mock.calls.length).toBeGreaterThan(1));
    });

    it('shows a wrong current password under that field (422)', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.changePassword.mockRejectedValue(
        new AppError({ status: 422, code: 'INVALID_PASSWORD', message: 'Wrong' }),
      );
      await renderScreen();
      await openForm();

      await fill();

      expect(await screen.findByText('The current password is incorrect.')).toBeOnTheScreen();
    });
  });

  describe('devices', () => {
    it('lists the devices and marks this one', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      await renderScreen();

      expect(await screen.findByText('Pixel 7 · Android 15')).toBeOnTheScreen();
      expect(screen.getByText('Edge on Windows')).toBeOnTheScreen();
      expect(screen.getByText('This device')).toBeOnTheScreen();
      // Only the OTHER device can be logged out.
      expect(screen.queryByTestId('session-signout-s1')).not.toBeOnTheScreen();
      expect(screen.getByTestId('session-signout-s2')).toBeOnTheScreen();
    });

    it('logs out one device after a confirmation', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.revokeSession.mockResolvedValue(undefined);
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('session-signout-s2'));

      await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith('s2', expect.anything()));
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ isDestructive: true, title: 'Log out this device?' }),
      );
      expect(await screen.findByText('Device logged out.')).toBeOnTheScreen();
    });

    it('does nothing when the confirmation is cancelled', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      mockConfirm.mockResolvedValue(false);
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('session-signout-s2'));

      expect(api.revokeSession).not.toHaveBeenCalled();
    });

    it('logs out all the other devices', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.revokeOtherSessions.mockResolvedValue({ revokedCount: 1 });
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('devices-signout-others'));

      await waitFor(() => expect(api.revokeOtherSessions).toHaveBeenCalled());
      expect(await screen.findByText('1 other device logged out.')).toBeOnTheScreen();
    });

    it('says so when this is the only device', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.sessions.mockResolvedValue([THIS_DEVICE]);
      await renderScreen();

      expect(await screen.findByText('You are not logged in anywhere else.')).toBeOnTheScreen();
      expect(screen.queryByTestId('devices-signout-others')).not.toBeOnTheScreen();
    });

    it('offers a retry when the devices cannot be loaded', async () => {
      setup({ twoFactorEnabled: false, recoveryCodesRemaining: 0 });
      api.sessions.mockRejectedValueOnce(
        new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }),
      );
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('devices-retry'));

      expect(await screen.findByText('Edge on Windows')).toBeOnTheScreen();
    });
  });

  it('shows an error with a retry when the security overview fails', async () => {
    api.sessions.mockResolvedValue([THIS_DEVICE]);
    api.overview.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }),
    );
    api.overview.mockResolvedValue({
      emailVerified: true,
      twoFactorEnabled: false,
      recoveryCodesRemaining: 0,
    });
    await renderScreen();

    expect(await screen.findByText("Couldn't load your security settings")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTestId('two-factor-enable')).toBeOnTheScreen();
  });
});
