import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';

import { deleteSecureItem, getSecureItem, setSecureItem, tokenStorage } from './secureStorage';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.isAvailableAsync.mockResolvedValue(true);
  });

  describe('when SecureStore is available', () => {
    it('reads, writes and deletes through expo-secure-store', async () => {
      store.getItemAsync.mockResolvedValue('abc');
      await expect(getSecureItem('k')).resolves.toBe('abc');
      await setSecureItem('k', 'v');
      await deleteSecureItem('k');

      expect(store.getItemAsync).toHaveBeenCalledWith('k');
      expect(store.setItemAsync).toHaveBeenCalledWith('k', 'v');
      expect(store.deleteItemAsync).toHaveBeenCalledWith('k');
    });

    it('returns null instead of throwing when a read fails', async () => {
      store.getItemAsync.mockRejectedValue(new Error('keystore locked'));
      await expect(getSecureItem('k')).resolves.toBeNull();
    });

    it('swallows a failed delete (nothing to remove)', async () => {
      store.deleteItemAsync.mockRejectedValue(new Error('missing'));
      await expect(deleteSecureItem('k')).resolves.toBeUndefined();
    });
  });

  describe('when SecureStore is unavailable (web)', () => {
    beforeEach(() => store.isAvailableAsync.mockResolvedValue(false));

    it('behaves as logged out without touching the store', async () => {
      await expect(getSecureItem('k')).resolves.toBeNull();
      await setSecureItem('k', 'v');
      await deleteSecureItem('k');
      expect(store.getItemAsync).not.toHaveBeenCalled();
      expect(store.setItemAsync).not.toHaveBeenCalled();
      expect(store.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('treats a throwing availability check as unavailable', async () => {
      store.isAvailableAsync.mockRejectedValue(new Error('no native module'));
      await expect(getSecureItem('k')).resolves.toBeNull();
    });
  });

  describe('tokenStorage', () => {
    it('stores the access and refresh tokens under their dedicated keys', async () => {
      store.getItemAsync.mockImplementation(async (key) =>
        key === STORAGE_KEYS.authToken ? 'access-jwt' : 'refresh-opaque',
      );
      await tokenStorage.set({ accessToken: 'access-jwt', refreshToken: 'refresh-opaque' });
      await expect(tokenStorage.get()).resolves.toEqual({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-opaque',
      });
      await tokenStorage.clear();

      expect(store.setItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authToken, 'access-jwt');
      expect(store.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.authRefreshToken,
        'refresh-opaque',
      );
      expect(store.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authToken);
      expect(store.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authRefreshToken);
    });

    it('reports a legacy access-only session as a token pair without refresh token', async () => {
      store.getItemAsync.mockImplementation(async (key) =>
        key === STORAGE_KEYS.authToken ? 'legacy-jwt' : null,
      );
      await expect(tokenStorage.get()).resolves.toEqual({
        accessToken: 'legacy-jwt',
        refreshToken: null,
      });
    });
  });

  describe('on the web (PLT-01)', () => {
    let data: Map<string, string>;

    beforeEach(() => {
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
    });

    afterEach(() => {
      jest.restoreAllMocks();
      Reflect.deleteProperty(globalThis, 'localStorage');
    });

    const NO_TOKENS = { accessToken: null, refreshToken: null };

    it('keeps the tokens in localStorage instead of SecureStore', async () => {
      await tokenStorage.set({ accessToken: 'jwt', refreshToken: 'refresh' });
      expect(data.get(STORAGE_KEYS.authToken)).toBe('jwt');
      expect(data.get(STORAGE_KEYS.authRefreshToken)).toBe('refresh');
      await expect(tokenStorage.get()).resolves.toEqual({
        accessToken: 'jwt',
        refreshToken: 'refresh',
      });

      await tokenStorage.clear();
      await expect(tokenStorage.get()).resolves.toEqual(NO_TOKENS);

      expect(store.isAvailableAsync).not.toHaveBeenCalled();
      expect(store.setItemAsync).not.toHaveBeenCalled();
      expect(store.getItemAsync).not.toHaveBeenCalled();
    });

    it('behaves as logged out when localStorage is blocked', async () => {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('SecurityError');
        },
      });
      await expect(getSecureItem('k')).resolves.toBeNull();
      await expect(setSecureItem('k', 'v')).resolves.toBeUndefined();
      await expect(deleteSecureItem('k')).resolves.toBeUndefined();
    });

    it('behaves as logged out when there is no localStorage at all (static render)', async () => {
      Reflect.deleteProperty(globalThis, 'localStorage');
      await expect(tokenStorage.get()).resolves.toEqual(NO_TOKENS);
      await expect(
        tokenStorage.set({ accessToken: 'jwt', refreshToken: 'refresh' }),
      ).resolves.toBeUndefined();
      await expect(tokenStorage.clear()).resolves.toBeUndefined();
      expect(store.setItemAsync).not.toHaveBeenCalled();
    });

    it('replaces the stored tokens when the user logs in again', async () => {
      await tokenStorage.set({ accessToken: 'first', refreshToken: 'r1' });
      await tokenStorage.set({ accessToken: 'second', refreshToken: 'r2' });
      await expect(tokenStorage.get()).resolves.toEqual({
        accessToken: 'second',
        refreshToken: 'r2',
      });
      expect(data.size).toBe(2);
    });

    it('reads null for tokens that were never saved', async () => {
      await expect(tokenStorage.get()).resolves.toEqual(NO_TOKENS);
    });

    it('swallows errors thrown by getItem and removeItem', async () => {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => undefined,
          removeItem: () => {
            throw new Error('SecurityError');
          },
        },
      });
      await expect(getSecureItem('k')).resolves.toBeNull();
      await expect(deleteSecureItem('k')).resolves.toBeUndefined();
    });

    it('does not throw when the storage quota is exceeded', async () => {
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
      await expect(setSecureItem('k', 'v')).resolves.toBeUndefined();
    });
  });
});
