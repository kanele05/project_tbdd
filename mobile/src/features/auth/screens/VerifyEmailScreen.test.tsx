import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { VerifyEmailScreen } from './VerifyEmailScreen';

const mockVerify = jest.fn();
const mockResend = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplace(href),
    dismissTo: (href: string) => mockDismissTo(href),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useVerifyEmail: () => ({ mutateAsync: mockVerify, isPending: false }),
  useResendVerification: () => ({ mutateAsync: mockResend, isPending: false }),
}));

function startFlow(resendInSec: number) {
  useAuthFlowStore.setState({
    verifyEmail: { email: 'rosie@example.com', resendAvailableAt: Date.now() + resendInSec * 1000 },
  });
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <VerifyEmailScreen />
    </ToastProvider>,
  );
}

const otp = () => screen.getByLabelText('6-digit code');

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({ verifyEmail: null });
  });

  it('goes back to Login when there is nothing to verify (e.g. after a reload)', async () => {
    await renderScreen();
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
  });

  it('shows the email the code was sent to', async () => {
    startFlow(60);
    await renderScreen();
    expect(screen.getByText(/rosie@example\.com/)).toBeOnTheScreen();
  });

  it('submits the code as soon as the sixth digit is typed and enters the app', async () => {
    startFlow(60);
    mockVerify.mockResolvedValue({});
    await renderScreen();

    await fireEvent.changeText(otp(), '123456');

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith({ email: 'rosie@example.com', code: '123456' }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(useAuthFlowStore.getState().verifyEmail).toBeNull();
  });

  it('accepts a pasted code with spaces and text around it', async () => {
    startFlow(60);
    mockVerify.mockResolvedValue({});
    await renderScreen();

    await fireEvent.changeText(otp(), 'Your code is 123 456');

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith({ email: 'rosie@example.com', code: '123456' }),
    );
  });

  it('shows the tries left after a wrong code and clears the boxes', async () => {
    startFlow(60);
    mockVerify.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'INVALID_CODE',
        message: 'Invalid',
        details: { attemptsLeft: 3 },
      }),
    );
    await renderScreen();

    await fireEvent.changeText(otp(), '000000');

    expect(await screen.findByText('That code is incorrect. Attempts left: 3.')).toBeOnTheScreen();
    expect(otp().props.value).toBe('');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('asks for a new code when the old one expired', async () => {
    startFlow(0);
    mockVerify.mockRejectedValue(
      new AppError({ status: 400, code: 'CODE_EXPIRED', message: 'Expired' }),
    );
    await renderScreen();

    await fireEvent.changeText(otp(), '123456');

    expect(await screen.findByText('This code has expired. Request a new one.')).toBeOnTheScreen();
    expect(screen.getByTestId('resend-button')).toBeOnTheScreen();
  });

  it('counts down before a new code can be requested', async () => {
    startFlow(42);
    await renderScreen();

    expect(screen.getByTestId('resend-countdown')).toHaveTextContent('Resend code in 0:42');
    expect(screen.queryByTestId('resend-button')).not.toBeOnTheScreen();
  });

  it('resends the code and restarts the countdown', async () => {
    startFlow(0);
    mockResend.mockResolvedValue({ sent: true, codeExpiresIn: 600, resendAfter: 60 });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('resend-button'));

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith({ email: 'rosie@example.com' }));
    expect(await screen.findByTestId('resend-countdown')).toHaveTextContent('Resend code in 1:00');
    expect(await screen.findByText('A new code is on its way.')).toBeOnTheScreen();
  });

  it('respects the server cooldown (429 RESEND_TOO_SOON)', async () => {
    startFlow(0);
    mockResend.mockRejectedValue(
      new AppError({
        status: 429,
        code: 'RESEND_TOO_SOON',
        message: 'Wait',
        details: { retryAfterSec: 30 },
      }),
    );
    await renderScreen();

    await fireEvent.press(screen.getByTestId('resend-button'));

    expect(await screen.findByTestId('resend-countdown')).toHaveTextContent('Resend code in 0:30');
    expect(
      await screen.findByText('Please wait 30 s before requesting another code.'),
    ).toBeOnTheScreen();
  });

  it('sends the user to Login when the email was already verified elsewhere', async () => {
    startFlow(60);
    mockVerify.mockRejectedValue(
      new AppError({ status: 409, code: 'ALREADY_VERIFIED', message: 'Already' }),
    );
    await renderScreen();

    await fireEvent.changeText(otp(), '123456');

    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
    expect(useAuthFlowStore.getState().verifyEmail).toBeNull();
  });
});
