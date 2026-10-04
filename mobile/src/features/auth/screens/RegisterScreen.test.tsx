import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { RegisterScreen } from './RegisterScreen';

const mockMutateAsync = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplace(href),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
}));

jest.mock('../hooks', () => ({
  useRegister: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
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

async function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    'Full name': 'Martha Rosie',
    Email: 'rosie@example.com',
    Password: 'abc12345',
    'Confirm password': 'abc12345',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await fireEvent.changeText(screen.getByLabelText(label), value as string);
  }
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({ verifyEmail: null });
  });

  it('shows password rule and mismatch errors', async () => {
    await render(<RegisterScreen />);

    await fillForm({ Password: 'abcdefgh', 'Confirm password': 'different' });
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must contain at least one number')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a password longer than 72 characters', async () => {
    await render(<RegisterScreen />);
    const long = `a1${'x'.repeat(80)}`;

    await fillForm({ Password: long, 'Confirm password': long });
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at most 72 characters')).toBeOnTheScreen();
  });

  it('needs the CAPTCHA before it calls the API', async () => {
    await render(<RegisterScreen />);

    await fillForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Please complete the human check first.')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('registers with trimmed values + CAPTCHA token and continues to email verification', async () => {
    mockMutateAsync.mockResolvedValue({
      user: {},
      emailVerificationRequired: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    await render(<RegisterScreen />);

    await fillForm({ 'Full name': '  Martha Rosie  ' });
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fullName: 'Martha Rosie',
        email: 'rosie@example.com',
        password: 'abc12345',
        captchaToken: 'captcha-token',
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/verify-email'));
    const flow = useAuthFlowStore.getState().verifyEmail;
    expect(flow?.email).toBe('rosie@example.com');
    expect(flow?.resendAvailableAt).toBeGreaterThan(Date.now());
  });

  it('shows the duplicate email error (409) under the email field', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({ status: 409, code: 'EMAIL_TAKEN', message: 'Email taken' }),
    );
    await render(<RegisterScreen />);

    await fillForm();
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('This email is already registered.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('asks for a fresh CAPTCHA after a failed attempt (the token is single-use)', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new AppError({
        status: 400,
        code: 'CAPTCHA_FAILED',
        message: 'failed',
        details: { captchaRequired: true },
      }),
    );
    await render(<RegisterScreen />);

    await fillForm();
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('The human check failed. Please try again.')).toBeOnTheScreen();

    // The old token was dropped: pressing again without solving shows the hint, no 2nd API call.
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Please complete the human check first.')).toBeOnTheScreen();
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });
});
