import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { showToast } from '@/components/ui/Toast';
import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { confirmAction } from '@/utils/confirmAction';

import { adminApi } from '../api';
import { makeUser } from '../testFixtures';
import { AdminUsersScreen } from './AdminUsersScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('../api', () => ({
  adminApi: { users: jest.fn(), disableUser: jest.fn(), enableUser: jest.fn() },
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const api = jest.mocked(adminApi);
const mockConfirm = jest.mocked(confirmAction);

function page(users = [makeUser()]) {
  return { data: users, meta: { page: 1, limit: 20, total: users.length, totalPages: 1 } };
}

describe('AdminUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.users.mockResolvedValue(page());
  });

  it('shows a skeleton while loading', async () => {
    api.users.mockReturnValue(new Promise(() => undefined));
    await renderWithClient(<AdminUsersScreen />);
    expect(screen.getByTestId('users-skeleton')).toBeOnTheScreen();
  });

  it('lists accounts with role and disabled badges and the disabled reason', async () => {
    api.users.mockResolvedValue(
      page([
        makeUser(),
        makeUser({
          id: 'u2',
          fullName: 'Bao Tran',
          role: 'TEACHER',
          disabledAt: '2026-10-09T00:00:00.000Z',
          disabledReason: 'Spam courses',
          courseCount: 2,
        }),
        makeUser({ id: 'u3', fullName: 'Root Admin', role: 'ADMIN' }),
      ]),
    );
    await renderWithClient(<AdminUsersScreen />);

    expect(await screen.findByText('Lan Nguyen')).toBeOnTheScreen();
    // One in the status filter chip, one on the user's badge.
    expect(screen.getAllByText('Disabled')).toHaveLength(2);
    expect(screen.getByText('Reason: Spam courses')).toBeOnTheScreen();
    expect(screen.getByText(/2 courses/)).toBeOnTheScreen();
    // Admin accounts have no disable / enable action.
    expect(screen.queryByTestId('disable-u3')).toBeNull();
    expect(screen.queryByTestId('enable-u3')).toBeNull();
    expect(screen.getByTestId('enable-u2')).toBeOnTheScreen();
  });

  it('searches after a pause and applies the role and status filters', async () => {
    jest.useFakeTimers();
    try {
      await renderWithClient(<AdminUsersScreen />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      await fireEvent.changeText(screen.getByPlaceholderText('Search name or e-mail'), ' lan ');
      await fireEvent.press(screen.getByTestId('role-TEACHER'));
      await fireEvent.press(screen.getByTestId('status-disabled'));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(500);
      });
      expect(api.users).toHaveBeenLastCalledWith({
        search: 'lan',
        role: 'TEACHER',
        status: 'disabled',
        limit: 20,
        page: 1,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('validates the reason, then disables the account', async () => {
    api.disableUser.mockResolvedValue(makeUser({ disabledAt: '2026-10-11T00:00:00.000Z' }));
    await renderWithClient(<AdminUsersScreen />);

    await fireEvent.press(await screen.findByTestId('disable-u1'));
    await fireEvent.changeText(screen.getByTestId('reason-input'), 'abc');
    await fireEvent.press(screen.getByTestId('reason-submit'));
    expect(await screen.findByText('Enter at least 5 characters.')).toBeOnTheScreen();
    expect(api.disableUser).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('reason-input'), 'Posting spam links');
    await fireEvent.press(screen.getByTestId('reason-submit'));
    await waitFor(() =>
      expect(api.disableUser).toHaveBeenCalledWith('u1', { reason: 'Posting spam links' }),
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Account disabled', { type: 'success' }),
    );
  });

  it('shows CANNOT_DISABLE_ADMIN inside the dialog', async () => {
    api.disableUser.mockRejectedValue(
      new AppError({ status: 422, code: 'CANNOT_DISABLE_ADMIN', message: 'x' }),
    );
    await renderWithClient(<AdminUsersScreen />);

    await fireEvent.press(await screen.findByTestId('disable-u1'));
    await fireEvent.changeText(screen.getByTestId('reason-input'), 'Posting spam links');
    await fireEvent.press(screen.getByTestId('reason-submit'));

    expect(await screen.findByText(/be disabled/)).toBeOnTheScreen();
  });

  it('asks for confirmation before enabling an account', async () => {
    api.users.mockResolvedValue(
      page([makeUser({ disabledAt: '2026-10-09T00:00:00.000Z', disabledReason: 'Spam' })]),
    );
    api.enableUser.mockResolvedValue(makeUser());
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderWithClient(<AdminUsersScreen />);

    await fireEvent.press(await screen.findByTestId('enable-u1'));
    expect(api.enableUser).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('enable-u1'));
    await waitFor(() => expect(api.enableUser).toHaveBeenCalledWith('u1'));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Account enabled', { type: 'success' }),
    );
  });

  it('shows the empty state', async () => {
    api.users.mockResolvedValueOnce(page([]));
    await renderWithClient(<AdminUsersScreen />);
    expect(await screen.findByText('No users found')).toBeOnTheScreen();
  });

  it('offers Retry after a failed load', async () => {
    api.users.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    );
    await renderWithClient(<AdminUsersScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Lan Nguyen')).toBeOnTheScreen();
  });
});
