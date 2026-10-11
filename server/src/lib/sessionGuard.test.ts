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

const row = (role = 'STUDENT') => ({ user: { role } });

beforeEach(() => mockFindFirst.mockReset());

describe('isSessionActive with the cache disabled (test mode)', () => {
  it('queries the database every time and filters revoked / expired sessions', async () => {
    mockFindFirst.mockResolvedValue(row());
    const { isSessionActive } = loadGuard(true);
    const now = new Date('2026-10-04T00:00:00Z');

    expect(await isSessionActive('s1', now)).toBe(true);
    expect(await isSessionActive('s1', now)).toBe(true);

    expect(mockFindFirst).toHaveBeenCalledTimes(2);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 's1', revokedAt: null, expiresAt: { gt: now }, user: { disabledAt: null } },
      select: { user: { select: { role: true } } },
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
    mockFindFirst.mockResolvedValue(row());
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
    mockFindFirst.mockResolvedValueOnce(row()).mockResolvedValueOnce(null);
    const { isSessionActive, forgetSession } = loadGuard(false);

    expect(await isSessionActive('s3')).toBe(true);
    forgetSession('s3');
    expect(await isSessionActive('s3')).toBe(false);
    expect(mockFindFirst).toHaveBeenCalledTimes(2);
  });
});

describe('resolveActiveSession', () => {
  it('returns the current database role of the session owner, not the token role', async () => {
    mockFindFirst.mockResolvedValue(row('ADMIN'));
    const { resolveActiveSession } = loadGuard(true);
    expect(await resolveActiveSession('s9')).toEqual({ role: 'ADMIN' });
  });

  it('returns null for a revoked session or a disabled account', async () => {
    mockFindFirst.mockResolvedValue(null);
    const { resolveActiveSession } = loadGuard(true);
    expect(await resolveActiveSession('s9')).toBeNull();
  });

  it('caches the role together with the session (until forgetSession)', async () => {
    mockFindFirst.mockResolvedValueOnce(row('TEACHER')).mockResolvedValueOnce(row('ADMIN'));
    const { resolveActiveSession, forgetSession } = loadGuard(false);
    expect(await resolveActiveSession('s10')).toEqual({ role: 'TEACHER' });
    expect(await resolveActiveSession('s10')).toEqual({ role: 'TEACHER' });
    forgetSession('s10');
    expect(await resolveActiveSession('s10')).toEqual({ role: 'ADMIN' });
  });
});
