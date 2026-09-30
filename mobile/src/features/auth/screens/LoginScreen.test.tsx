import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

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
  },
}));

jest.mock('../hooks', () => ({
  useLogin: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useRegister: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

async function renderScreen() {
  return render(
    <ToastProvider>
      <LoginScreen />
    </ToastProvider>,
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid credentials and navigates home', async () => {
    mockMutateAsync.mockResolvedValue({ token: 't', user: {} });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'rosie@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'rosie@example.com',
        password: 'secret123',
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows the server error for wrong credentials (401)', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'rosie@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-pass1');
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('links to the register screen', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Sign up' }));
    expect(mockPush).toHaveBeenCalledWith('/register');
  });
});
