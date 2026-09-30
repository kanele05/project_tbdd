import { authApi } from '@/features/auth/api';
import { getAccessToken, setAccessToken } from '@/lib/apiClient';
import { AppError } from '@/lib/appError';
import { clearPersistedCache } from '@/lib/persister';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { tokenStorage } from '@/lib/secureStorage';
import type { UserDto } from '@/types/api';

import { useAuthStore } from './authStore';
import { useSearchFilterStore } from './searchFilterStore';

jest.mock('@/features/auth/api', () => ({
  authApi: { meForBootstrap: jest.fn(), me: jest.fn(), login: jest.fn(), register: jest.fn() },
}));
jest.mock('@/lib/secureStorage', () => ({
  tokenStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/lib/persister', () => ({
  clearPersistedCache: jest.fn(() => Promise.resolve()),
  persistOptions: {},
}));

const USER: UserDto = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Martha Rosie',
  headline: 'UX/UI Designer',
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
};

const mockedApi = jest.mocked(authApi);
const mockedTokenStorage = jest.mocked(tokenStorage);
const mockedClearPersisted = jest.mocked(clearPersistedCache);

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAccessToken(null);
    queryClient.clear();
    useAuthStore.setState({ token: null, user: null, status: 'idle', sessionExpired: false });
    mockedTokenStorage.clear.mockResolvedValue(undefined);
    mockedTokenStorage.set.mockResolvedValue(undefined);
  });

  describe('hydrate', () => {
    it('becomes unauthenticated when there is no stored token', async () => {
      mockedTokenStorage.get.mockResolvedValue(null);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedApi.meForBootstrap).not.toHaveBeenCalled();
    });

    it('authenticates with a valid token and seeds the ["me"] query', async () => {
      mockedTokenStorage.get.mockResolvedValue('good.token');
      mockedApi.meForBootstrap.mockResolvedValue(USER);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(USER);
      expect(state.token).toBe('good.token');
      expect(getAccessToken()).toBe('good.token');
      expect(queryClient.getQueryData(queryKeys.me())).toEqual(USER);
    });

    it('clears the token when /auth/me answers 401', async () => {
      mockedTokenStorage.get.mockResolvedValue('bad.token');
      mockedApi.meForBootstrap.mockRejectedValue(
        new AppError({ status: 401, code: 'UNAUTHORIZED', message: 'expired' }),
      );

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(getAccessToken()).toBeNull();
    });

    it('stays logged in offline when a persisted user profile exists', async () => {
      mockedTokenStorage.get.mockResolvedValue('good.token');
      mockedApi.meForBootstrap.mockRejectedValue(
        new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }),
      );
      queryClient.setQueryData(queryKeys.me(), USER);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(USER);
    });

    it('goes to Login but keeps the token when offline without a cached user', async () => {
      mockedTokenStorage.get.mockResolvedValue('good.token');
      mockedApi.meForBootstrap.mockRejectedValue(
        new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }),
      );

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('stores the token securely and marks the session authenticated', async () => {
      await useAuthStore.getState().login('new.token', USER);

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(USER);
      expect(mockedTokenStorage.set).toHaveBeenCalledWith('new.token');
      expect(getAccessToken()).toBe('new.token');
    });
  });

  describe('logout', () => {
    it('clears token, user, query caches, persisted cache and search filters', async () => {
      await useAuthStore.getState().login('t', USER);
      queryClient.setQueryData(queryKeys.cart(), { items: [], totalCents: 0 });
      useSearchFilterStore.getState().setMinRating(4.5);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(queryClient.getQueryData(queryKeys.cart())).toBeUndefined();
      expect(queryClient.getQueryData(queryKeys.me())).toBeUndefined();
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(mockedClearPersisted).toHaveBeenCalled();
      expect(useSearchFilterStore.getState().minRating).toBeNull();
    });

    it('flags the session as expired when forced by a 401', async () => {
      await useAuthStore.getState().login('t', USER);
      await useAuthStore.getState().logout({ expired: true });
      expect(useAuthStore.getState().sessionExpired).toBe(true);
    });
  });
});
