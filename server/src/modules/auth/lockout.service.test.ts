import * as lockout from './lockout.service';

const mockUserUpdate = jest.fn();
const mockRecordAuthEvent = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: { user: { update: (...args: unknown[]) => mockUserUpdate(...args) } },
}));
jest.mock('./authEvent.service', () => ({
  recordAuthEvent: (...args: unknown[]) => mockRecordAuthEvent(...args),
}));

const now = new Date('2026-10-04T08:00:00Z');
const ctx = { ip: '1.2.3.4', userAgent: 'jest', lang: 'en' as const };

beforeEach(() => {
  mockUserUpdate.mockReset();
  mockRecordAuthEvent.mockReset();
});

describe('policy constants', () => {
  it('locks for 15 minutes after 5 failures and asks for a CAPTCHA from the 3rd', () => {
    expect(lockout.MAX_FAILED_ATTEMPTS).toBe(5);
    expect(lockout.LOCK_DURATION_SEC).toBe(900);
    expect(lockout.CAPTCHA_AFTER_FAILURES).toBe(3);
  });

  it('needsCaptcha is true from 3 failures', () => {
    expect(lockout.needsCaptcha({ failedCount: 2 })).toBe(false);
    expect(lockout.needsCaptcha({ failedCount: 3 })).toBe(true);
    expect(lockout.needsCaptcha({ failedCount: 4 })).toBe(true);
  });
});

describe('assertNotLocked / lockedError', () => {
  it('passes when there is no lock or the lock has expired', () => {
    expect(() => lockout.assertNotLocked({ failedCount: 0, lockedUntil: null }, now)).not.toThrow();
    expect(() =>
      lockout.assertNotLocked({ failedCount: 0, lockedUntil: new Date(now.getTime() - 1) }, now),
    ).not.toThrow();
    expect(() => lockout.assertNotLocked({ failedCount: 0, lockedUntil: now }, now)).not.toThrow();
  });

  it('throws 423 ACCOUNT_LOCKED with retryAfterSec while locked', () => {
    const lockedUntil = new Date(now.getTime() + 600_500);
    let error: unknown;
    try {
      lockout.assertNotLocked({ failedCount: 0, lockedUntil }, now);
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      details: { retryAfterSec: 601 },
    });
  });

  it('retryAfterSec never drops below 1', () => {
    expect(lockout.retryAfterSec(new Date(now.getTime() + 10), now)).toBe(1);
  });

  it('stateOf maps the user columns', () => {
    const lockedUntil = new Date();
    expect(lockout.stateOf({ failedLoginCount: 2, lockedUntil })).toEqual({
      failedCount: 2,
      lockedUntil,
    });
  });
});

describe('recordFailure', () => {
  it('increments atomically and reports the new count below the limit', async () => {
    mockUserUpdate.mockResolvedValue({ failedLoginCount: 3 });
    const result = await lockout.recordFailure('u1', now);
    expect(result).toEqual({ failedCount: 3, lockedUntil: null, justLocked: false });
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
  });

  it('locks for 15 minutes and resets the counter on the 5th failure', async () => {
    mockUserUpdate
      .mockResolvedValueOnce({ failedLoginCount: 5 })
      .mockResolvedValueOnce({ id: 'u1' });
    const result = await lockout.recordFailure('u1', now);
    const lockedUntil = new Date(now.getTime() + 900_000);
    expect(result).toEqual({ failedCount: 0, lockedUntil, justLocked: true });
    expect(mockUserUpdate).toHaveBeenLastCalledWith({
      where: { id: 'u1' },
      data: { failedLoginCount: 0, lockedUntil },
      select: { id: true },
    });
  });
});

describe('registerFailedAttempt', () => {
  it('records LOGIN_FAILED and returns the result while below the limit', async () => {
    mockUserUpdate.mockResolvedValue({ failedLoginCount: 2 });
    const result = await lockout.registerFailedAttempt(
      'u1',
      'LOGIN_FAILED',
      ctx,
      'invalid_password',
    );
    expect(result.failedCount).toBe(2);
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'LOGIN_FAILED',
      ctx,
      metadata: { reason: 'invalid_password' },
    });
  });

  it('records TWO_FACTOR_FAILED for second-factor failures', async () => {
    mockUserUpdate.mockResolvedValue({ failedLoginCount: 1 });
    await lockout.registerFailedAttempt('u1', 'TWO_FACTOR_FAILED', ctx, 'invalid_code');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TWO_FACTOR_FAILED' }),
    );
  });

  it('records LOGIN_LOCKED and throws 423 when this attempt locks the account', async () => {
    mockUserUpdate
      .mockResolvedValueOnce({ failedLoginCount: 5 })
      .mockResolvedValueOnce({ id: 'u1' });
    await expect(
      lockout.registerFailedAttempt('u1', 'LOGIN_FAILED', ctx, 'invalid_password'),
    ).rejects.toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOGIN_LOCKED' }),
    );
  });
});

describe('resetFailures', () => {
  it('does nothing when the account is already clean', async () => {
    await lockout.resetFailures({ id: 'u1', failedLoginCount: 0, lockedUntil: null });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('clears the counter and the lock', async () => {
    mockUserUpdate.mockResolvedValue({ id: 'u1' });
    await lockout.resetFailures({ id: 'u1', failedLoginCount: 2, lockedUntil: null });
    await lockout.resetFailures({ id: 'u1', failedLoginCount: 0, lockedUntil: new Date() });
    expect(mockUserUpdate).toHaveBeenCalledTimes(2);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { failedLoginCount: 0, lockedUntil: null },
      select: { id: true },
    });
  });
});

describe('unknown email shadow counter (same behaviour as a real account)', () => {
  it('counts failures, then locks after 5 and expires with the lock state', () => {
    const email = `shadow-${Date.now()}@example.com`;
    expect(lockout.getUnknownEmailState(email)).toEqual({ failedCount: 0, lockedUntil: null });
    for (let i = 1; i <= 4; i += 1) {
      expect(lockout.recordUnknownEmailFailure(email, now)).toEqual({
        failedCount: i,
        lockedUntil: null,
        justLocked: false,
      });
    }
    expect(lockout.getUnknownEmailState(email).failedCount).toBe(4);

    const locked = lockout.recordUnknownEmailFailure(email, now);
    expect(locked.justLocked).toBe(true);
    expect(locked.lockedUntil).toEqual(new Date(now.getTime() + 900_000));
    expect(() => lockout.assertNotLocked(lockout.getUnknownEmailState(email), now)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_LOCKED' }),
    );
  });

  it('keeps separate counters per email', () => {
    const a = `a-${Date.now()}@example.com`;
    const b = `b-${Date.now()}@example.com`;
    lockout.recordUnknownEmailFailure(a, now);
    expect(lockout.getUnknownEmailState(a).failedCount).toBe(1);
    expect(lockout.getUnknownEmailState(b).failedCount).toBe(0);
  });
});
