import { TtlCache } from './cache';

describe('TtlCache', () => {
  it('stores and returns values', () => {
    const cache = new TtlCache();
    cache.set('a', { n: 1 });
    expect(cache.get('a')).toEqual({ n: 1 });
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires values after the TTL', async () => {
    const cache = new TtlCache({ defaultTtlMs: 20 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get('a')).toBeUndefined();
  });

  it('supports a per-key TTL override', async () => {
    const cache = new TtlCache({ defaultTtlMs: 60_000 });
    cache.set('short', 1, 20);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get('short')).toBeUndefined();
  });

  it('invalidates by prefix only', () => {
    const cache = new TtlCache();
    cache.set('courses:1', 1);
    cache.set('courses:2', 2);
    cache.set('home:x', 3);
    expect(cache.invalidatePrefix('courses:')).toBe(2);
    expect(cache.get('courses:1')).toBeUndefined();
    expect(cache.get('home:x')).toBe(3);
  });

  it('wrap calls the loader once and caches the result (including null)', async () => {
    const cache = new TtlCache();
    const loader = jest.fn().mockResolvedValue(null);
    await expect(cache.wrap('k', 1000, loader)).resolves.toBeNull();
    await expect(cache.wrap('k', 1000, loader)).resolves.toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('wrap always calls the loader when the cache is disabled', async () => {
    const cache = new TtlCache({ enabled: false });
    const loader = jest.fn().mockResolvedValue('v');
    await cache.wrap('k', 1000, loader);
    await cache.wrap('k', 1000, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.get('k')).toBeUndefined();
  });
});
