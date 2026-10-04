import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { LoginScreen } from './LoginScreen';

const mockMutateAsync = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplace(href),
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    canGoBack: () => true,
    dismissTo: jest.fn(),
  },
}));

jest.mock('../hooks', () => ({
  useLogin: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../components/TurnstileWidget', () => {
  const { createElement } = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) =>
      createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Solve CAPTCHA',
          onPress: () => onToken('captcha-token'),
        },
        createElement(Text, null, 'captcha'),
      ),
  };
});

async function renderScreen() {
  return render(
    <ToastProvider>
      <LoginScreen />
    </ToastProvider>,
  );
}

async function submit(email = 'rosie@example.com', password = 'secret123') {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
}

const SESSION = { twoFactorRequired: false, accessToken: 'a', refreshToken: 'r', user: {} };

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({
      verifyEmail: null,
      twoFactor: null,
      resetEmail: null,
      loginNotice: null,
    });
  });

  it('shows field errors when submitting an empty form', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeOnTheScreen();
    expect(screen.getByText('Password is required')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('validates the email format', async () => {
    await renderScreen();

    await submit('not-an-email');

    expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid credentials (no CAPTCHA token yet) and navigates home', async () => {
    mockMutateAsync.mockResolvedValue(SESSION);
    await renderScreen();

    await submit();

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'rosie@example.com',
        password: 'secret123',
        captchaToken: undefined,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows the server error for wrong credentials (401) without a CAPTCHA at first', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        details: { captchaRequired: false },
      }),
    );
    await renderScreen();

    await submit('rosie@example.com', 'wrong-pass1');

    expect(await screen.findByText('Incorrect email or password.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Solve CAPTCHA')).not.toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('asks for the CAPTCHA when the server says so, then sends the token', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new AppError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        details: { captchaRequired: true },
      }),
    );
    await renderScreen();
    await submit('rosie@example.com', 'wrong-pass1');
    expect(await screen.findByLabelText('Solve CAPTCHA')).toBeOnTheScreen();

    // Without a token the form does not even call the API.
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Please complete the human check first.')).toBeOnTheScreen();
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    mockMutateAsync.mockResolvedValueOnce(SESSION);
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenLastCalledWith({
        email: 'rosie@example.com',
        password: 'wrong-pass1',
        captchaToken: 'captcha-token',
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('continues to the 2FA step when the account has two-step verification', async () => {
    mockMutateAsync.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: 'challenge-1',
      challengeExpiresIn: 300,
    });
    await renderScreen();

    await submit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/two-factor'));
    expect(useAuthFlowStore.getState().twoFactor?.challengeToken).toBe('challenge-1');
    expect(mockReplace).not.toHaveBeenCalled();
    // The password does not linger in the form while the user is on the next step.
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('sends an unverified account to the email verification step', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email',
        details: { email: 'rosie@example.com', resendAfter: 42 },
      }),
    );
    await renderScreen();

    await submit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/verify-email'));
    const flow = useAuthFlowStore.getState().verifyEmail;
    expect(flow?.email).toBe('rosie@example.com');
    expect(flow?.resendAvailableAt).toBeGreaterThan(Date.now());
  });

  it('locks the form with a countdown after too many failed attempts (423)', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({
        status: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Locked',
        details: { retryAfterSec: 900 },
      }),
    );
    await renderScreen();

    await submit();

    expect(await screen.findByTestId('lockout-banner')).toBeOnTheScreen();
    expect(screen.getByText('Too many failed attempts. Try again in 15:00.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled();
    expect(screen.queryByTestId('form-error')).not.toBeOnTheScreen();
  });

  it('shows the confirmation after a password reset and pre-fills the email', async () => {
    useAuthFlowStore.setState({ loginNotice: 'passwordReset', resetEmail: 'rosie@example.com' });
    await renderScreen();

    expect(
      await screen.findByText('Your password was updated. Log in with the new password.'),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByLabelText('Email').props.value).toBe('rosie@example.com'),
    );
  });

  it('links to the register and forgot-password screens', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'Sign up' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }));

    expect(mockPush).toHaveBeenCalledWith('/register');
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });
});
