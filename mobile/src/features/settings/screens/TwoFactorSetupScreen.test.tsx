import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { createTestQueryClient } from '@/test/queryWrapper';
import { renderWithProviders } from '@/test/renderWithProviders';

import { securityApi } from '../api';
import { TwoFactorSetupScreen } from './TwoFactorSetupScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (href: unknown) => mockReplace(href),
    push: jest.fn(),
    canGoBack: () => mockCanGoBack,
  },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../api', () => ({
  securityApi: { setupTwoFactor: jest.fn(), enableTwoFactor: jest.fn() },
}));

const api = jest.mocked(securityApi);

const SETUP = {
  secret: 'JBSWY3DPEHPK3PXP',
  otpauthUrl: 'otpauth://totp/E-Learning:a%40b.co?secret=JBSWY3DPEHPK3PXP&issuer=E-Learning',
};
const CODES = Array.from({ length: 10 }, (_, index) => `CCCC${index}-DDDD${index}`);

async function renderScreen() {
  return renderWithProviders(
    <ToastProvider>
      <TwoFactorSetupScreen />
    </ToastProvider>,
    { client: createTestQueryClient() },
  );
}

describe('TwoFactorSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    api.setupTwoFactor.mockResolvedValue(SETUP);
  });

  it('asks the server for a secret exactly once and shows the QR code and the key', async () => {
    await renderScreen();

    expect(await screen.findByTestId('qr-code')).toBeOnTheScreen();
    expect(screen.getByTestId('two-factor-secret')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
    expect(api.setupTwoFactor).toHaveBeenCalledTimes(1);
  });

  it('turns two-step verification on with the first code and shows the recovery codes once', async () => {
    api.enableTwoFactor.mockResolvedValue({ recoveryCodes: CODES });
    await renderScreen();
    await screen.findByTestId('qr-code');

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

    await waitFor(() =>
      expect(api.enableTwoFactor).toHaveBeenCalledWith({ code: '123456' }, expect.anything()),
    );
    expect(await screen.findByText('Save your recovery codes')).toBeOnTheScreen();
    expect(screen.getAllByTestId('recovery-code')).toHaveLength(10);
    expect(screen.getByText('CCCC0-DDDD0')).toBeOnTheScreen();
    // The QR code is gone: the secret is not needed any more.
    expect(screen.queryByTestId('qr-code')).not.toBeOnTheScreen();
  });

  it('goes back to Security after the user confirms they saved the codes', async () => {
    api.enableTwoFactor.mockResolvedValue({ recoveryCodes: CODES });
    await renderScreen();
    await screen.findByTestId('qr-code');
    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

    await fireEvent.press(await screen.findByTestId('recovery-saved'));

    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opens Security when there is no history after saving the codes (URL / F5 on the web)', async () => {
    mockCanGoBack = false;
    api.enableTwoFactor.mockResolvedValue({ recoveryCodes: CODES });
    await renderScreen();
    await screen.findByTestId('qr-code');
    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

    await fireEvent.press(await screen.findByTestId('recovery-saved'));

    expect(mockReplace).toHaveBeenCalledWith('/settings/security');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the error and clears the boxes when the code is wrong', async () => {
    api.enableTwoFactor.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'INVALID_CODE',
        message: 'Invalid',
        details: { attemptsLeft: 4 },
      }),
    );
    await renderScreen();
    await screen.findByTestId('qr-code');

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '000000');

    expect(await screen.findByText('That code is incorrect. Attempts left: 4.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Authentication code').props.value).toBe('');
  });

  it('offers a retry when the setup cannot start', async () => {
    api.setupTwoFactor.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }),
    );
    await renderScreen();

    expect(await screen.findByText("Couldn't start the setup")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTestId('qr-code')).toBeOnTheScreen();
    expect(api.setupTwoFactor).toHaveBeenCalledTimes(2);
  });
});
