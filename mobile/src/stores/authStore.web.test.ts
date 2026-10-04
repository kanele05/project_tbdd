import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';
import { authApi } from '@/features/auth/api';
import { getAccessToken, setAccessToken } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import type { UserDto } from '@/types/api';

import { useAuthStore } from './authStore';

/** PLT-01: on the web there is no SecureStore, the session lives in localStorage. */

jest.mock('@/features/auth/api', () => ({
  authApi: { meForBootstrap: jest.fn(), me: jest.fn(), login: jest.fn(), register: jest.fn() },
}));
jest.mock('@/lib/persister', () => ({
  clearPersistedCache: jest.fn(() => Promise.resolve()),
  persistOptions: {},
}));
jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const USER: UserDto = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
};

const mockedApi = jest.mocked(authApi);

describe('authStore on the web', () => {
  let data: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'web');
    data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
      },
    });
    setAccessToken(null);
    queryClient.clear();
    useAuthStore.setState({ token: null, user: null, status: 'idle', sessionExpired: false });
  });

  afterEach(() => {
    // Dropping the cache stops the garbage-collection timers so Jest can exit.
    queryClient.clear();
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('saves the token in localStorage on login and clears it on logout', async () => {
    await useAuthStore.getState().login('web.token', USER);
    expect(data.get(STORAGE_KEYS.authToken)).toBe('web.token');
    expect(getAccessToken()).toBe('web.token');

    await useAuthStore.getState().logout();
    expect(data.has(STORAGE_KEYS.authToken)).toBe(false);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('restores the session after a page reload', async () => {
    data.set(STORAGE_KEYS.authToken, 'web.token');
    mockedApi.meForBootstrap.mockResolvedValue(USER);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      token: 'web.token',
      user: USER,
    });
    expect(getAccessToken()).toBe('web.token');
  });

  it('starts logged out when the browser blocks localStorage', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError');
      },
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(mockedApi.meForBootstrap).not.toHaveBeenCalled();
  });

  it('still logs in (for this tab) when the token cannot be saved', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => undefined,
      },
    });

    await useAuthStore.getState().login('web.token', USER);

    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
