import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';

import { useAuthFlowStore } from '../authFlowStore';
import { ResetPasswordScreen } from './ResetPasswordScreen';

const mockReset = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    dismissTo: (href: string) => mockDismissTo(href),
    push: jest.fn(),
    back: () => mockBack(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useResetPassword: () => ({ mutateAsync: mockReset, isPending: false }),
}));

async function fill(code = '123456', password = 'abc12345', confirm = 'abc12345') {
  await fireEvent.changeText(screen.getByLabelText('6-digit code'), code);
  await fireEvent.changeText(screen.getByLabelText('New password'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), confirm);
  await fireEvent.press(screen.getByRole('button', { name: 'Update password' }));
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthFlowStore.setState({ resetEmail: 'rosie@example.com', loginNotice: null });
  });

  it('goes back to Login when there is no email to reset', async () => {
    useAuthFlowStore.setState({ resetEmail: null });
    await render(<ResetPasswordScreen />);
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
  });

  it('validates the code and the password rules', async () => {
    await render(<ResetPasswordScreen />);

    await fill('123', 'abcdefgh', 'different');

    expect(await screen.findByText('Enter the 6-digit code')).toBeOnTheScreen();
    expect(screen.getByText('Password must contain at least one number')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets the password and returns to Login with a confirmation', async () => {
    mockReset.mockResolvedValue(undefined);
    await render(<ResetPasswordScreen />);

    await fill();

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith({
        email: 'rosie@example.com',
        code: '123456',
        newPassword: 'abc12345',
      }),
    );
    await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/login'));
    expect(useAuthFlowStore.getState().loginNotice).toBe('passwordReset');
  });

  it('shows the tries left under the code after a wrong one', async () => {
    mockReset.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'INVALID_CODE',
        message: 'Invalid',
        details: { attemptsLeft: 2 },
      }),
    );
    await render(<ResetPasswordScreen />);

    await fill();

    expect(await screen.findByTestId('reset-code-error')).toHaveTextContent(
      'That code is incorrect. Attempts left: 2.',
    );
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('tells the user to request a new code when it expired', async () => {
    mockReset.mockRejectedValue(
      new AppError({ status: 400, code: 'CODE_EXPIRED', message: 'Expired' }),
    );
    await render(<ResetPasswordScreen />);

    await fill();

    expect(await screen.findByText('This code has expired. Request a new one.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reset-request-new'));
    expect(mockBack).toHaveBeenCalled();
  });
});
