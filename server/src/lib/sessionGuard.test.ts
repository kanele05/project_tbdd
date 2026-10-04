import type * as GuardNamespace from './sessionGuard';

const mockFindFirst = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: { session: { findFirst: (...args: unknown[]) => mockFindFirst(...args) } },
}));

type Guard = typeof GuardNamespace;

/** Nạp module với `isTest` cho trước: test thường tắt cache, ở đây cần cả hai chế độ. */
function loadGuard(isTest: boolean): Guard {
  let loaded: Guard | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/config/env', () => ({ isTest }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('./sessionGuard') as Guard;
  });
  jest.dontMock('@/config/env');
  return loaded as Guard;
}

beforeEach(() => mockFindFirst.mockReset());

describe('isSessionActive with the cache disabled (test mode)', () => {
  it('queries the database every time and filters revoked / expired sessions', async () => {
    mockFindFirst.mockResolvedValue({ id: 's1' });
    const { isSessionActive } = loadGuard(true);
    const now = new Date('2026-10-04T00:00:00Z');

    expect(await isSessionActive('s1', now)).toBe(true);
    expect(await isSessionActive('s1', now)).toBe(true);

    expect(mockFindFirst).toHaveBeenCalledTimes(2);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 's1', revokedAt: null, expiresAt: { gt: now } },
      select: { id: true },
    });
  });

  it('returns false when the session is revoked, expired or missing', async () => {
    mockFindFirst.mockResolvedValue(null);
    const { isSessionActive } = loadGuard(true);
    expect(await isSessionActive('gone')).toBe(false);
  });
});

describe('isSessionActive with the cache enabled', () => {
  it('caches only positive results: the second call does not hit the database', async () => {
    mockFindFirst.mockResolvedValue({ id: 's1' });
    const { isSessionActive } = loadGuard(false);

    expect(await isSessionActive('s1')).toBe(true);
    expect(await isSessionActive('s1')).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it('never caches a negative result', async () => {
    mockFindFirst.mockResolvedValue(null);
    const { isSessionActive } = loadGuard(false);

    expect(await isSessionActive('s2')).toBe(false);
    expect(await isSessionActive('s2')).toBe(false);
    expect(mockFindFirst).toHaveBeenCalledTimes(2);
  });

  it('forgetSession makes a revoked session fail on the very next request', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 's3' }).mockResolvedValueOnce(null);
    const { isSessionActive, forgetSession } = loadGuard(false);

    expect(await isSessionActive('s3')).toBe(true);
    forgetSession('s3');
    expect(await isSessionActive('s3')).toBe(false);
    expect(mockFindFirst).toHaveBeenCalledTimes(2);
  });
});
