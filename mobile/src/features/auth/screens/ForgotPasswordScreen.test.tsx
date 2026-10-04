import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

const mockForgot = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    dismissTo: jest.fn(),
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useForgotPassword: () => ({ mutateAsync: mockForgot, isPending: false }),
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
      <ForgotPasswordScreen />
    </ToastProvider>,
  );
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({ resetEmail: null });
  });

  it('validates the email', async () => {
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'nope');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('needs the CAPTCHA first', async () => {
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'rosie@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText('Please complete the human check first.')).toBeOnTheScreen();
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('always answers the same way and continues to the reset screen', async () => {
    mockForgot.mockResolvedValue({ sent: true, codeExpiresIn: 600, resendAfter: 60 });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), ' rosie@example.com ');
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() =>
      expect(mockForgot).toHaveBeenCalledWith({
        email: 'rosie@example.com',
        captchaToken: 'captcha-token',
      }),
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/reset-password'));
    expect(useAuthFlowStore.getState().resetEmail).toBe('rosie@example.com');
    expect(
      await screen.findByText('If an account exists for this email, a code is on its way.'),
    ).toBeOnTheScreen();
  });

  it('shows a rate-limit message', async () => {
    mockForgot.mockRejectedValue(
      new AppError({
        status: 429,
        code: 'RESEND_TOO_SOON',
        message: 'Wait',
        details: { retryAfterSec: 45 },
      }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'rosie@example.com');
    await fireEvent.press(screen.getByLabelText('Solve CAPTCHA'));
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    expect(
      await screen.findByText('Please wait 45 s before requesting another code.'),
    ).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
