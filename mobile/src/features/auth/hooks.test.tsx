import { act, renderHook } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/authStore';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { AuthResponse, UserDto } from '@/types/api';

import { authApi } from './api';
import { useLogin, useRegister } from './hooks';

jest.mock('./api', () => ({
  authApi: { login: jest.fn(), register: jest.fn(), me: jest.fn(), meForBootstrap: jest.fn() },
}));

const mockLogin = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mocked = authApi as jest.Mocked<typeof authApi>;

const USER = { id: 'u1', email: 'a@b.co', fullName: 'Jane' } as UserDto;
const RESPONSE: AuthResponse = { token: 'jwt-token', user: USER };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (state: { login: jest.Mock }) => unknown) => selector({ login: mockLogin }),
  );
});

afterEach(async () => {
  await act(flushNotifications);
});

describe('useLogin', () => {
  it('stores the session after a successful login', async () => {
    mocked.login.mockResolvedValue(RESPONSE);
    const { result } = await renderHook(() => useLogin(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.co', password: 'secret123' });
      await flushNotifications();
    });

    // TanStack Query v5 also passes a mutation context as 2nd argument; only the body matters.
    expect(mocked.login.mock.calls[0]?.[0]).toEqual({ email: 'a@b.co', password: 'secret123' });
    expect(mockLogin).toHaveBeenCalledWith('jwt-token', USER);
  });

  it('does not touch the session when the credentials are wrong', async () => {
    mocked.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    const { result } = await renderHook(() => useLogin(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.co', password: 'bad' }).catch(() => undefined);
      await flushNotifications();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});

describe('useRegister', () => {
  it('logs the user in right away after registering', async () => {
    mocked.register.mockResolvedValue(RESPONSE);
    const { result } = await renderHook(() => useRegister(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    const body = { email: 'a@b.co', password: 'secret123', fullName: 'Jane' };

    await act(async () => {
      await result.current.mutateAsync(body);
      await flushNotifications();
    });

    expect(mocked.register.mock.calls[0]?.[0]).toEqual(body);
    expect(mockLogin).toHaveBeenCalledWith('jwt-token', USER);
  });
});
