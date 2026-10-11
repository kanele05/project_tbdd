import { fireEvent, screen } from '@testing-library/react-native';
import { Text, useWindowDimensions } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';

import { AuthLayout } from './AuthLayout';
import { AUTH_CARD_WIDTH } from './DesktopAuthLayout';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (href: string) => mockReplace(href),
    canGoBack: () => true,
  },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1440, height: 900, scale: 1, fontScale: 1 })),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

describe('AuthLayout on a wide window (WEB-05a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1440);
  });

  it('shows the poster wall, the wordmark link and the form in a centered card', async () => {
    await renderWithProviders(
      <AuthLayout title="Welcome back!" subtitle="Log in to continue" footer={<Text>Sign up</Text>}>
        <Text>form body</Text>
      </AuthLayout>,
    );
    expect(screen.getByTestId('auth-desktop')).toBeOnTheScreen();
    expect(
      screen.getByTestId('auth-poster-wall', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('auth-sheet')).toHaveStyle({ maxWidth: AUTH_CARD_WIDTH });
    expect(screen.getByRole('header', { name: 'Welcome back!' })).toBeOnTheScreen();
    expect(screen.getByText('Log in to continue')).toBeOnTheScreen();
    expect(screen.getByText('form body')).toBeOnTheScreen();
    expect(screen.getByText('Sign up')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-back')).toBeNull();
    // The phone tagline is not part of the desktop card layout.
    expect(screen.queryByLabelText('Learn anything. Anytime.')).toBeNull();
  });

  it('sends the wordmark link to Login', async () => {
    await renderWithProviders(
      <AuthLayout title="Create account" subtitle="Join us">
        <Text>x</Text>
      </AuthLayout>,
    );
    await fireEvent.press(screen.getByRole('link', { name: 'Back to sign in' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('keeps the card dark in light mode so its text stays readable', async () => {
    await renderWithProviders(
      <AuthLayout title="Welcome back!" subtitle="Log in to continue">
        <Text>x</Text>
      </AuthLayout>,
      { theme: 'light' },
    );
    expect(screen.getByText('Welcome back!')).toHaveStyle({ color: darkPalette.text });
  });

  it('adds a back button and the icon to the step screens', async () => {
    const onBack = jest.fn();
    await renderWithProviders(
      <AuthLayout icon="mail" title="Verify your email" subtitle="We sent a code" onBack={onBack}>
        <Text>otp</Text>
      </AuthLayout>,
    );
    expect(screen.getByRole('header', { name: 'Verify your email' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('auth-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('goes back to the previous screen by default', async () => {
    await renderWithProviders(
      <AuthLayout icon="key" title="Forgot" subtitle="Reset it">
        <Text>x</Text>
      </AuthLayout>,
    );
    await fireEvent.press(screen.getByTestId('auth-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('is in Vietnamese and uses the card from the tablet breakpoint (768)', async () => {
    setWidth(768);
    await renderWithProviders(
      <AuthLayout title="Chào mừng trở lại!" subtitle="Đăng nhập">
        <Text>x</Text>
      </AuthLayout>,
      { language: 'vi' },
    );
    expect(screen.getByTestId('auth-desktop')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Về trang đăng nhập' })).toBeOnTheScreen();
  });

  it('keeps the phone layout below 768', async () => {
    setWidth(767);
    await renderWithProviders(
      <AuthLayout title="Welcome back!" subtitle="Log in to continue">
        <Text>x</Text>
      </AuthLayout>,
    );
    expect(screen.queryByTestId('auth-desktop')).toBeNull();
    expect(screen.getByLabelText('Learn anything. Anytime.')).toBeOnTheScreen();
  });
});
