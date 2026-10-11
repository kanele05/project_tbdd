import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';

import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplace(href),
    push: (href: string) => mockPush(href),
    canGoBack: () => true,
    back: () => mockBack(),
  },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1440, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('../hooks', () => ({
  useLogin: () => ({ mutateAsync: mockLogin, isPending: false }),
  useRegister: () => ({ mutateAsync: mockRegister, isPending: false }),
}));
jest.mock('../components/CaptchaWidget', () => {
  const { createElement } = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    CaptchaWidget: ({ onToken }: { onToken: (token: string) => void }) =>
      createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Verify security',
          onPress: () => onToken('captcha-token'),
        },
        createElement(Text, null, 'captcha'),
      ),
  };
});

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

describe('auth screens on a wide window (WEB-05a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWindowDimensions.mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
  });

  it('login: renders in the desktop card, Enter in the password field submits, links navigate', async () => {
    mockLogin.mockResolvedValue({ twoFactorRequired: false });
    await render(
      <ToastProvider>
        <LoginScreen />
      </ToastProvider>,
    );
    expect(screen.getByTestId('auth-desktop')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'rosie@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/');

    await fireEvent.press(screen.getByRole('link', { name: 'Sign up' }));
    expect(mockPush).toHaveBeenCalledWith('/register');
    await fireEvent.press(screen.getByTestId('login-forgot'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });

  it('register: keeps the role picker and the captcha inside the card', async () => {
    await render(<RegisterScreen />);
    expect(screen.getByTestId('auth-desktop')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Teacher' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Verify security' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Log in' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the phone layout on a phone-sized window', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    await render(<RegisterScreen />);
    expect(screen.queryByTestId('auth-desktop')).toBeNull();
  });
});
