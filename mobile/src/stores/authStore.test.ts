import { AxiosError } from 'axios';

import { authApi } from '@/features/auth/api';
import {
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  refreshClient,
  setAuthTokens,
} from '@/lib/apiClient';
import { AppError } from '@/lib/appError';
import { clearPersistedCache } from '@/lib/persister';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { tokenStorage } from '@/lib/secureStorage';
import type { UserDto } from '@/types/api';

import { useAuthStore } from './authStore';
import { useSearchFilterStore } from './searchFilterStore';

jest.mock('@/features/auth/api', () => ({
  authApi: {
    meForBootstrap: jest.fn(),
    me: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
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

const SESSION = { accessToken: 'access.1', refreshToken: 'refresh.1', user: USER };
const mockedApi = jest.mocked(authApi);
const mockedTokenStorage = jest.mocked(tokenStorage);
const mockedClearPersisted = jest.mocked(clearPersistedCache);

const networkError = () => new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' });
const unauthorized = () => new AppError({ status: 401, code: 'UNAUTHORIZED', message: 'expired' });

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthTokens(null);
    queryClient.clear();
    useAuthStore.setState({ token: null, user: null, status: 'idle', sessionExpired: false });
    mockedTokenStorage.clear.mockResolvedValue(undefined);
    mockedTokenStorage.set.mockResolvedValue(undefined);
    mockedApi.logout.mockResolvedValue(undefined);
  });

  describe('hydrate', () => {
    it('becomes unauthenticated when there are no stored tokens', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: null, refreshToken: null });

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedApi.meForBootstrap).not.toHaveBeenCalled();
    });

    it('authenticates with valid tokens and seeds the ["me"] query', async () => {
      mockedTokenStorage.get.mockResolvedValue({
        accessToken: 'good.token',
        refreshToken: 'good.refresh',
      });
      mockedApi.meForBootstrap.mockResolvedValue(USER);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(USER);
      expect(state.token).toBe('good.token');
      expect(getAccessToken()).toBe('good.token');
      expect(getRefreshToken()).toBe('good.refresh');
      expect(queryClient.getQueryData(queryKeys.me())).toEqual(USER);
    });

    it('still accepts an access-only (pre-refresh-token) session until the server rejects it', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: 'legacy', refreshToken: null });
      mockedApi.meForBootstrap.mockResolvedValue(USER);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(getRefreshToken()).toBeNull();
    });

    it('clears an access-only session the server no longer accepts', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: 'legacy', refreshToken: null });
      mockedApi.meForBootstrap.mockRejectedValue(unauthorized());

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(getAccessToken()).toBeNull();
    });

    it('clears the tokens when /auth/me answers 401 (refresh was refused too)', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: 'bad', refreshToken: 'bad.r' });
      mockedApi.meForBootstrap.mockRejectedValue(unauthorized());

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it('gets a new access token first when only the refresh token survived', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: null, refreshToken: 'refresh.1' });
      refreshClient.defaults.adapter = async (config) => ({
        data: {
          data: { accessToken: 'access.2', refreshToken: 'refresh.2', accessTokenExpiresIn: 900 },
        },
        status: 200,
        statusText: '',
        headers: {},
        config,
      });
      mockedApi.meForBootstrap.mockResolvedValue(USER);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', token: 'access.2' });
      expect(mockedTokenStorage.set).toHaveBeenCalledWith({
        accessToken: 'access.2',
        refreshToken: 'refresh.2',
      });
    });

    it('logs out when that refresh is refused', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: null, refreshToken: 'revoked' });
      refreshClient.defaults.adapter = async (config) => {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          data: { error: { code: 'INVALID_REFRESH_TOKEN', message: 'nope' } },
          status: 401,
          statusText: '',
          headers: {},
          config,
        });
      };

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(mockedApi.meForBootstrap).not.toHaveBeenCalled();
    });

    it('stays logged in offline when a persisted user profile exists', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: 'good', refreshToken: 'good.r' });
      mockedApi.meForBootstrap.mockRejectedValue(networkError());
      queryClient.setQueryData(queryKeys.me(), USER);

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(USER);
    });

    it('goes to Login but keeps the tokens when offline without a cached user', async () => {
      mockedTokenStorage.get.mockResolvedValue({ accessToken: 'good', refreshToken: 'good.r' });
      mockedApi.meForBootstrap.mockRejectedValue(networkError());

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('stores both tokens securely and marks the session authenticated', async () => {
      await useAuthStore.getState().login(SESSION);

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(USER);
      expect(mockedTokenStorage.set).toHaveBeenCalledWith({
        accessToken: 'access.1',
        refreshToken: 'refresh.1',
      });
      expect(getAccessToken()).toBe('access.1');
      expect(getRefreshToken()).toBe('refresh.1');
    });
  });

  describe('logout', () => {
    it('clears tokens, user, query caches, persisted cache and search filters', async () => {
      await useAuthStore.getState().login(SESSION);
      queryClient.setQueryData(queryKeys.cart(), { items: [], totalCents: 0 });
      useSearchFilterStore.getState().setMinRating(4.5);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(queryClient.getQueryData(queryKeys.cart())).toBeUndefined();
      expect(queryClient.getQueryData(queryKeys.me())).toBeUndefined();
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
      expect(mockedClearPersisted).toHaveBeenCalled();
      expect(useSearchFilterStore.getState().minRating).toBeNull();
    });

    it('revokes the session on the server with the refresh token', async () => {
      await useAuthStore.getState().login(SESSION);

      await useAuthStore.getState().logout();

      expect(mockedApi.logout).toHaveBeenCalledWith('refresh.1');
    });

    it('still logs out locally when the server cannot be reached', async () => {
      await useAuthStore.getState().login(SESSION);
      mockedApi.logout.mockRejectedValue(networkError());

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockedTokenStorage.clear).toHaveBeenCalled();
    });

    it('does not call the server when the logout was forced (session already over)', async () => {
      await useAuthStore.getState().login(SESSION);

      await useAuthStore.getState().logout({ expired: true });

      expect(mockedApi.logout).not.toHaveBeenCalled();
      expect(useAuthStore.getState().sessionExpired).toBe(true);
    });

    it('does nothing when nobody is logged in', async () => {
      useAuthStore.setState({ status: 'unauthenticated', token: null });

      await useAuthStore.getState().logout();

      expect(mockedTokenStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe('token refresh wiring', () => {
    function mockRefreshReply() {
      refreshClient.defaults.adapter = async (config) => ({
        data: {
          data: { accessToken: 'access.2', refreshToken: 'refresh.2', accessTokenExpiresIn: 900 },
        },
        status: 200,
        statusText: '',
        headers: {},
        config,
      });
    }

    it('persists every rotated pair and mirrors the access token in the store', async () => {
      await useAuthStore.getState().login(SESSION);
      mockRefreshReply();

      await expect(refreshAccessToken()).resolves.toBe('access.2');

      expect(mockedTokenStorage.set).toHaveBeenLastCalledWith({
        accessToken: 'access.2',
        refreshToken: 'refresh.2',
      });
      expect(useAuthStore.getState().token).toBe('access.2');
    });

    it('ends the session (flagged as expired) when the refresh token is refused', async () => {
      await useAuthStore.getState().login(SESSION);
      refreshClient.defaults.adapter = async (config) => {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          data: { error: { code: 'INVALID_REFRESH_TOKEN', message: 'nope' } },
          status: 401,
          statusText: '',
          headers: {},
          config,
        });
      };

      await expect(refreshAccessToken()).rejects.toMatchObject({ status: 401 });
      await new Promise((resolve) => setTimeout(resolve, 0)); // the logout runs asynchronously

      expect(useAuthStore.getState()).toMatchObject({
        status: 'unauthenticated',
        sessionExpired: true,
      });
      expect(mockedApi.logout).not.toHaveBeenCalled();
    });

    it('does not resurrect a session that was logged out while the new pair was being saved', async () => {
      await useAuthStore.getState().login(SESSION);
      mockRefreshReply();
      mockedTokenStorage.set.mockImplementation(async () => {
        // The user taps "Log out" while the storage write is still running.
        setAuthTokens(null);
      });

      await refreshAccessToken();

      expect(mockedTokenStorage.clear).toHaveBeenCalled();
    });
  });
});
