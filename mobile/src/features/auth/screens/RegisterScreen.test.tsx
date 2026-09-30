import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';

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
  useLogin: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRegister: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

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
  });

  it('shows password rule and mismatch errors', async () => {
    await render(<RegisterScreen />);

    await fillForm({ Password: 'abcdefgh', 'Confirm password': 'different' });
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must contain at least one number')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('registers with trimmed values and goes home', async () => {
    mockMutateAsync.mockResolvedValue({ token: 't', user: {} });
    await render(<RegisterScreen />);

    await fillForm({ 'Full name': '  Martha Rosie  ' });
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        fullName: 'Martha Rosie',
        email: 'rosie@example.com',
        password: 'abc12345',
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows the duplicate email error (409) under the email field', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({ status: 409, code: 'EMAIL_TAKEN', message: 'Email taken' }),
    );
    await render(<RegisterScreen />);

    await fillForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('This email is already registered.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
