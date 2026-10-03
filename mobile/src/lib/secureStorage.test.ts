import * as SecureStore from 'expo-secure-store';

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
    it('stores the auth token under the dedicated key', async () => {
      store.getItemAsync.mockResolvedValue('jwt');
      await tokenStorage.set('jwt');
      await expect(tokenStorage.get()).resolves.toBe('jwt');
      await tokenStorage.clear();

      expect(store.setItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authToken, 'jwt');
      expect(store.getItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authToken);
      expect(store.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.authToken);
    });
  });
});
