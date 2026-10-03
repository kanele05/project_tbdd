import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

import { APP_VERSION, CACHE_MAX_AGE_MS, STORAGE_KEYS } from '@/constants/config';

import { clearPersistedCache, persistOptions } from './persister';
import { queryKeys } from './queryKeys';

const clients: QueryClient[] = [];

afterEach(() => clients.splice(0).forEach((client) => client.clear()));

async function buildQuery(queryKey: readonly unknown[], isSuccessful: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  clients.push(client);
  const queryFn = isSuccessful
    ? () => Promise.resolve({ ok: true })
    : () => Promise.reject(new Error('boom'));
  await client.prefetchQuery({ queryKey, queryFn, retry: false });
  const query = client.getQueryCache().find({ queryKey });
  if (!query) throw new Error('query not created');
  return query;
}

describe('persistOptions (PLAN section 10)', () => {
  const shouldDehydrate = persistOptions.dehydrateOptions?.shouldDehydrateQuery;

  it('keeps the cache for 24 h and busts it with the app version', () => {
    expect(persistOptions.maxAge).toBe(CACHE_MAX_AGE_MS);
    expect(CACHE_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    expect(persistOptions.buster).toBe(APP_VERSION);
  });

  it('persists a successful query whose key is marked persisted', async () => {
    const query = await buildQuery(queryKeys.home(), true);
    expect(shouldDehydrate?.(query)).toBe(true);
  });

  it('does not persist a query that failed', async () => {
    const query = await buildQuery(queryKeys.home(), false);
    expect(shouldDehydrate?.(query)).toBe(false);
  });

  it('does not persist a query whose key is not in the persisted list', async () => {
    const query = await buildQuery(['lesson', 'l1'], true);
    expect(shouldDehydrate?.(query)).toBe(false);
  });
});

describe('clearPersistedCache', () => {
  it('removes the stored query cache from AsyncStorage (logout)', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.queryCache, '{"clientState":{}}');
    await clearPersistedCache();
    await expect(AsyncStorage.getItem(STORAGE_KEYS.queryCache)).resolves.toBeNull();
  });
});
