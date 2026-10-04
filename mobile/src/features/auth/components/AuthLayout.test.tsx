import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AuthLayout } from './AuthLayout';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (href: string) => mockReplace(href),
    canGoBack: () => mockCanGoBack,
  },
}));

describe('AuthLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it('puts the tagline on the poster wall and the title + form on the glass sheet (sign in / up)', async () => {
    await renderWithProviders(
      <AuthLayout title="Welcome back!" subtitle="Log in to continue" footer={<Text>Sign up</Text>}>
        <Text>form body</Text>
      </AuthLayout>,
    );
    expect(screen.getByLabelText('Learn anything. Anytime.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Welcome back!' })).toBeOnTheScreen();
    expect(screen.getByText('Log in to continue')).toBeOnTheScreen();
    expect(screen.getByText('form body')).toBeOnTheScreen();
    expect(screen.getByText('Sign up')).toBeOnTheScreen();
    expect(screen.getByTestId('auth-sheet')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-back')).toBeNull();
    expect(
      screen.getByTestId('auth-poster-wall', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('shows the step title over the wall with a back button (verify / 2FA / reset)', async () => {
    await renderWithProviders(
      <AuthLayout icon="mail" title="Verify your email" subtitle="We sent a code">
        <Text>otp</Text>
      </AuthLayout>,
    );
    expect(screen.getByRole('header', { name: 'Verify your email' })).toBeOnTheScreen();
    expect(screen.getByText('We sent a code')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Learn anything. Anytime.')).toBeNull();
    expect(screen.getByText('otp')).toBeOnTheScreen();
  });

  it('goes back, or to Login when there is no history', async () => {
    await renderWithProviders(
      <AuthLayout icon="key" title="Forgot" subtitle="Reset it">
        <Text>x</Text>
      </AuthLayout>,
    );
    await fireEvent.press(screen.getByTestId('auth-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack = false;
    await fireEvent.press(screen.getByTestId('auth-back'));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('uses the custom back handler of a step', async () => {
    const onBack = jest.fn();
    await renderWithProviders(
      <AuthLayout icon="shield" title="2FA" subtitle="Code" onBack={onBack}>
        <Text>x</Text>
      </AuthLayout>,
    );
    await fireEvent.press(screen.getByTestId('auth-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the Vietnamese tagline and works in dark mode', async () => {
    await renderWithProviders(
      <AuthLayout title="Chào mừng trở lại!" subtitle="Đăng nhập">
        <Text>x</Text>
      </AuthLayout>,
      { language: 'vi', theme: 'dark' },
    );
    expect(screen.getByLabelText('Học mọi thứ. Mọi lúc.')).toBeOnTheScreen();
  });
});
