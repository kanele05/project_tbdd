import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { TwoFactorScreen } from './TwoFactorScreen';

const mockVerify = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    dismissTo: (href: string) => mockDismissTo(href),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useTwoFactorLogin: () => ({ mutateAsync: mockVerify, isPending: false }),
}));

function startChallenge(expiresInSec = 300) {
  useAuthFlowStore.setState({
    twoFactor: { challengeToken: 'challenge-1', expiresAt: Date.now() + expiresInSec * 1000 },
  });
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <TwoFactorScreen />
    </ToastProvider>,
  );
}

describe('TwoFactorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({ twoFactor: null });
  });

  it('goes back to Login when there is no challenge', async () => {
    await renderScreen();
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
  });

  it('verifies the 6-digit authenticator code with the challenge token', async () => {
    startChallenge();
    mockVerify.mockResolvedValue({});
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '654321');

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith({ challengeToken: 'challenge-1', code: '654321' }),
    );
    await waitFor(() => expect(useAuthFlowStore.getState().twoFactor).toBeNull());
  });

  it('shows the tries left after a wrong code', async () => {
    startChallenge();
    mockVerify.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'INVALID_CODE',
        message: 'Invalid',
        details: { attemptsLeft: 4 },
      }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '000000');

    expect(await screen.findByText('That code is incorrect. Attempts left: 4.')).toBeOnTheScreen();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('switches to a recovery code, formats it as XXXXX-XXXXX and submits it', async () => {
    startChallenge();
    mockVerify.mockResolvedValue({});
    await renderScreen();

    await fireEvent.press(screen.getByTestId('two-factor-switch'));
    const input = screen.getByTestId('two-factor-recovery');
    await fireEvent.changeText(input, 'abcde fghjk');

    expect(screen.getByTestId('two-factor-recovery').props.value).toBe('ABCDE-FGHJK');
    await fireEvent.press(screen.getByTestId('two-factor-submit'));

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith({
        challengeToken: 'challenge-1',
        recoveryCode: 'ABCDE-FGHJK',
      }),
    );
  });

  it('keeps Verify disabled until the recovery code is complete', async () => {
    startChallenge();
    await renderScreen();

    await fireEvent.press(screen.getByTestId('two-factor-switch'));
    await fireEvent.changeText(screen.getByTestId('two-factor-recovery'), 'ABCDE');

    expect(screen.getByTestId('two-factor-submit')).toBeDisabled();
  });

  it('starts over from Login when the server rejects the challenge', async () => {
    startChallenge();
    mockVerify.mockRejectedValue(
      new AppError({ status: 401, code: 'INVALID_CHALLENGE', message: 'Expired' }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
    expect(useAuthFlowStore.getState().twoFactor).toBeNull();
  });

  it('returns to Login when the account got locked meanwhile (423)', async () => {
    startChallenge();
    mockVerify.mockRejectedValue(
      new AppError({
        status: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Locked',
        details: { retryAfterSec: 600 },
      }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Authentication code'), '123456');

    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
  });

  it('returns to Login once the 5-minute challenge has expired', async () => {
    startChallenge(0);
    await renderScreen();

    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
    expect(useAuthFlowStore.getState().twoFactor).toBeNull();
  });
});
