import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

import { APP_VERSION, CACHE_MAX_AGE_MS, STORAGE_KEYS } from '@/constants/config';

import { isPersistedQueryKey } from './queryKeys';

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEYS.queryCache,
  throttleTime: 1000,
});

/**
 * Options for `PersistQueryClientProvider` (PLAN.md §10):
 * - `maxAge` 24 h, `buster` = app version (a new version discards the old cache);
 * - only successful queries whose key is marked persisted in `isPersistedQueryKey` are saved.
 */
export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: APP_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) && isPersistedQueryKey(query.queryKey),
  },
};

/** Remove the persisted cache from AsyncStorage (called on logout so no data leaks to the next user). */
export async function clearPersistedCache(): Promise<void> {
  await persister.removeClient();
  await AsyncStorage.removeItem(STORAGE_KEYS.queryCache);
}
