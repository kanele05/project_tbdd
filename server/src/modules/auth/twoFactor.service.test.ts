import {
  decryptSecret,
  encryptSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from '@/lib/authCrypto';
import { hashPassword } from '@/lib/password';
import { base32Decode, generateTotpSecret, totp, totpStep } from '@/lib/totp';

import type * as LockoutNamespace from './lockout.service';
import * as twoFactor from './twoFactor.service';

const mockDb = {
  userFindUnique: jest.fn(),
  userUpdate: jest.fn(),
  userUpdateMany: jest.fn(),
  recoveryCount: jest.fn(),
  recoveryDeleteMany: jest.fn(),
  recoveryCreateMany: jest.fn(),
  recoveryUpdateMany: jest.fn(),
};
const mockRegisterFailedAttempt = jest.fn();
const mockResetFailures = jest.fn();
const mockRecordAuthEvent = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockDb.userFindUnique(...args),
      update: (...args: unknown[]) => mockDb.userUpdate(...args),
      updateMany: (...args: unknown[]) => mockDb.userUpdateMany(...args),
    },
    recoveryCode: {
      count: (...args: unknown[]) => mockDb.recoveryCount(...args),
      deleteMany: (...args: unknown[]) => mockDb.recoveryDeleteMany(...args),
      createMany: (...args: unknown[]) => mockDb.recoveryCreateMany(...args),
      updateMany: (...args: unknown[]) => mockDb.recoveryUpdateMany(...args),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));
jest.mock('./lockout.service', () => ({
  ...jest.requireActual<typeof LockoutNamespace>('./lockout.service'),
  registerFailedAttempt: (...args: unknown[]) => mockRegisterFailedAttempt(...args),
  resetFailures: (...args: unknown[]) => mockResetFailures(...args),
}));
jest.mock('./authEvent.service', () => ({
  recordAuthEvent: (...args: unknown[]) => mockRecordAuthEvent(...args),
}));

const now = new Date('2026-10-04T08:00:00Z');
const ctx = { ip: '1.2.3.4', userAgent: 'jest', lang: 'en' as const };
const SECRET = generateTotpSecret();
const validCode = totp(base32Decode(SECRET), now.getTime());

async function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'martha@example.com',
    passwordHash: await hashPassword('Learn2026'),
    emailVerifiedAt: new Date(),
    totpSecretEnc: encryptSecret(SECRET),
    totpEnabledAt: new Date('2026-09-01T00:00:00Z'),
    totpLastStep: null,
    failedLoginCount: 0,
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(mockDb).forEach((fn) => fn.mockReset());
  mockRegisterFailedAttempt.mockReset();
  mockResetFailures.mockReset();
  mockRecordAuthEvent.mockReset();
  mockDb.userUpdate.mockResolvedValue({ id: 'user-1' });
  mockDb.recoveryDeleteMany.mockResolvedValue({ count: 0 });
  mockDb.recoveryCreateMany.mockResolvedValue({ count: 10 });
});

describe('verifySecondFactor', () => {
  const user = { id: 'user-1', totpSecretEnc: encryptSecret(SECRET), totpLastStep: null };

  it('accepts a valid TOTP code and stores its step to block reuse', async () => {
    mockDb.userUpdateMany.mockResolvedValue({ count: 1 });
    await expect(twoFactor.verifySecondFactor(user, { code: validCode }, now)).resolves.toBe(
      'totp',
    );
    expect(mockDb.userUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: totpStep(now.getTime()) } }],
      },
      data: { totpLastStep: totpStep(now.getTime()) },
    });
  });

  it('rejects a code whose step was already used (replay)', async () => {
    const replayed = { ...user, totpLastStep: totpStep(now.getTime()) };
    await expect(
      twoFactor.verifySecondFactor(replayed, { code: validCode }, now),
    ).resolves.toBeNull();
    expect(mockDb.userUpdateMany).not.toHaveBeenCalled();
  });

  it('loses a race for the same code when another request stored the step first', async () => {
    mockDb.userUpdateMany.mockResolvedValue({ count: 0 });
    await expect(twoFactor.verifySecondFactor(user, { code: validCode }, now)).resolves.toBeNull();
  });

  it('rejects a wrong code and a user without a secret', async () => {
    await expect(twoFactor.verifySecondFactor(user, { code: '000000' }, now)).resolves.toBeNull();
    await expect(
      twoFactor.verifySecondFactor({ ...user, totpSecretEnc: null }, { code: validCode }, now),
    ).resolves.toBeNull();
  });

  it('accepts an unused recovery code (normalized) exactly once', async () => {
    mockDb.recoveryUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await expect(
      twoFactor.verifySecondFactor(user, { recoveryCode: 'abcde-fghjk' }, now),
    ).resolves.toBe('recovery');
    expect(mockDb.recoveryUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', codeHash: hashRecoveryCode('user-1', 'ABCDEFGHJK'), usedAt: null },
      data: { usedAt: now },
    });
    await expect(
      twoFactor.verifySecondFactor(user, { recoveryCode: 'ABCDE-FGHJK' }, now),
    ).resolves.toBeNull();
  });

  it('rejects a malformed recovery code without touching the database', async () => {
    await expect(
      twoFactor.verifySecondFactor(user, { recoveryCode: 'short' }, now),
    ).resolves.toBeNull();
    expect(mockDb.recoveryUpdateMany).not.toHaveBeenCalled();
  });

  it('returns null when neither a code nor a recovery code is given', async () => {
    await expect(twoFactor.verifySecondFactor(user, {}, now)).resolves.toBeNull();
  });
});

describe('getSecurityOverview', () => {
  it('reports verification, 2FA state and remaining recovery codes', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    mockDb.recoveryCount.mockResolvedValue(7);
    await expect(twoFactor.getSecurityOverview('user-1')).resolves.toEqual({
      emailVerified: true,
      twoFactorEnabled: true,
      recoveryCodesRemaining: 7,
    });
    expect(mockDb.recoveryCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', usedAt: null },
    });
  });

  it('skips the recovery code count when 2FA is off', async () => {
    mockDb.userFindUnique.mockResolvedValue(
      await userRow({ totpEnabledAt: null, totpSecretEnc: null, emailVerifiedAt: null }),
    );
    await expect(twoFactor.getSecurityOverview('user-1')).resolves.toEqual({
      emailVerified: false,
      twoFactorEnabled: false,
      recoveryCodesRemaining: 0,
    });
    expect(mockDb.recoveryCount).not.toHaveBeenCalled();
  });

  it('throws 401 when the account no longer exists', async () => {
    mockDb.userFindUnique.mockResolvedValue(null);
    await expect(twoFactor.getSecurityOverview('gone')).rejects.toMatchObject({ status: 401 });
  });
});

describe('setupTwoFactor', () => {
  it('stores a fresh encrypted secret and returns it with an otpauth URL', async () => {
    mockDb.userFindUnique.mockResolvedValue(
      await userRow({ totpEnabledAt: null, totpSecretEnc: null }),
    );

    const result = await twoFactor.setupTwoFactor('user-1');

    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    const url = new URL(result.otpauthUrl);
    expect(url.protocol).toBe('otpauth:');
    expect(url.searchParams.get('secret')).toBe(result.secret);
    expect(decodeURIComponent(url.pathname)).toBe('/E-Learning:martha@example.com');

    const data = (
      mockDb.userUpdate.mock.calls[0]?.[0] as {
        data: { totpSecretEnc: string; totpLastStep: null };
      }
    ).data;
    expect(data.totpSecretEnc).not.toContain(result.secret);
    expect(decryptSecret(data.totpSecretEnc)).toBe(result.secret);
    expect(data.totpLastStep).toBeNull();
  });

  it('refuses when 2FA is already enabled (409)', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    await expect(twoFactor.setupTwoFactor('user-1')).rejects.toMatchObject({
      status: 409,
      code: 'TWO_FACTOR_ALREADY_ENABLED',
    });
    expect(mockDb.userUpdate).not.toHaveBeenCalled();
  });
});

describe('enableTwoFactor', () => {
  const pending = { totpEnabledAt: null };

  it('enables 2FA with a valid code and returns 10 recovery codes whose hashes are stored', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow(pending));

    const { recoveryCodes } = await twoFactor.enableTwoFactor('user-1', validCode, ctx, now);

    expect(recoveryCodes).toHaveLength(10);
    expect(new Set(recoveryCodes).size).toBe(10);
    for (const code of recoveryCodes) expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    expect(mockDb.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { totpEnabledAt: now, totpLastStep: totpStep(now.getTime()) },
      select: { id: true },
    });
    const stored = (
      mockDb.recoveryCreateMany.mock.calls[0]?.[0] as {
        data: { userId: string; codeHash: string }[];
      }
    ).data;
    expect(stored.map((s) => s.codeHash)).toEqual(
      recoveryCodes.map((c) => hashRecoveryCode('user-1', normalizeRecoveryCode(c) ?? '')),
    );
    expect(JSON.stringify(stored)).not.toContain(recoveryCodes[0]);
    expect(mockDb.recoveryDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'TWO_FACTOR_ENABLED',
      ctx,
    });
  });

  it('rejects a wrong code with 400 INVALID_CODE and does not enable anything', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow(pending));
    await expect(twoFactor.enableTwoFactor('user-1', '000000', ctx, now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
    });
    expect(mockDb.userUpdate).not.toHaveBeenCalled();
    expect(mockDb.recoveryCreateMany).not.toHaveBeenCalled();
  });

  it('requires setup first (422 TWO_FACTOR_NOT_SETUP) and refuses a second enable (409)', async () => {
    mockDb.userFindUnique.mockResolvedValue(
      await userRow({ totpEnabledAt: null, totpSecretEnc: null }),
    );
    await expect(twoFactor.enableTwoFactor('user-1', validCode, ctx, now)).rejects.toMatchObject({
      status: 422,
      code: 'TWO_FACTOR_NOT_SETUP',
    });
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    await expect(twoFactor.enableTwoFactor('user-1', validCode, ctx, now)).rejects.toMatchObject({
      status: 409,
      code: 'TWO_FACTOR_ALREADY_ENABLED',
    });
  });
});

describe('disableTwoFactor', () => {
  it('turns 2FA off with the password and a valid TOTP code, wiping the secret and recovery codes', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    mockDb.userUpdateMany.mockResolvedValue({ count: 1 });

    await twoFactor.disableTwoFactor(
      'user-1',
      { password: 'Learn2026', code: validCode },
      ctx,
      now,
    );

    expect(mockDb.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null },
      select: { id: true },
    });
    expect(mockDb.recoveryDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mockResetFailures).toHaveBeenCalled();
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'TWO_FACTOR_DISABLED',
      ctx,
    });
  });

  it('accepts a recovery code instead of a TOTP code and logs its use', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    mockDb.recoveryUpdateMany.mockResolvedValue({ count: 1 });
    await twoFactor.disableTwoFactor(
      'user-1',
      { password: 'Learn2026', recoveryCode: 'ABCDE-FGHJK' },
      ctx,
      now,
    );
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'RECOVERY_CODE_USED',
      ctx,
    });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'TWO_FACTOR_DISABLED',
      ctx,
    });
  });

  it('rejects a wrong password with 422 INVALID_PASSWORD and counts it as a failed attempt', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    await expect(
      twoFactor.disableTwoFactor('user-1', { password: 'WrongPass1', code: validCode }, ctx, now),
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_PASSWORD' });
    expect(mockRegisterFailedAttempt).toHaveBeenCalledWith(
      'user-1',
      'LOGIN_FAILED',
      ctx,
      'invalid_password',
    );
    expect(mockDb.userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a wrong code with 400 INVALID_CODE and counts it as a failed attempt', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    await expect(
      twoFactor.disableTwoFactor('user-1', { password: 'Learn2026', code: '000000' }, ctx, now),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_CODE' });
    expect(mockRegisterFailedAttempt).toHaveBeenCalledWith(
      'user-1',
      'TWO_FACTOR_FAILED',
      ctx,
      'invalid_second_factor',
    );
    expect(mockDb.userUpdate).not.toHaveBeenCalled();
  });

  it('refuses when 2FA is not enabled (422) and when the account is locked (423)', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow({ totpEnabledAt: null }));
    await expect(
      twoFactor.disableTwoFactor('user-1', { password: 'Learn2026', code: validCode }, ctx, now),
    ).rejects.toMatchObject({ status: 422, code: 'TWO_FACTOR_NOT_ENABLED' });

    mockDb.userFindUnique.mockResolvedValue(
      await userRow({ lockedUntil: new Date(now.getTime() + 60_000) }),
    );
    await expect(
      twoFactor.disableTwoFactor('user-1', { password: 'Learn2026', code: validCode }, ctx, now),
    ).rejects.toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
  });
});

describe('regenerateRecoveryCodes', () => {
  it('replaces all codes after a valid TOTP code', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    mockDb.userUpdateMany.mockResolvedValue({ count: 1 });

    const { recoveryCodes } = await twoFactor.regenerateRecoveryCodes(
      'user-1',
      { code: validCode },
      ctx,
      now,
    );

    expect(recoveryCodes).toHaveLength(10);
    expect(mockDb.recoveryDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'RECOVERY_CODES_REGENERATED',
      ctx,
    });
  });

  it('rejects a wrong code, requires 2FA to be on, and respects the lock', async () => {
    mockDb.userFindUnique.mockResolvedValue(await userRow());
    await expect(
      twoFactor.regenerateRecoveryCodes('user-1', { code: '000000' }, ctx, now),
    ).rejects.toMatchObject({ code: 'INVALID_CODE' });
    expect(mockDb.recoveryCreateMany).not.toHaveBeenCalled();

    mockDb.userFindUnique.mockResolvedValue(await userRow({ totpEnabledAt: null }));
    await expect(
      twoFactor.regenerateRecoveryCodes('user-1', { code: validCode }, ctx, now),
    ).rejects.toMatchObject({ code: 'TWO_FACTOR_NOT_ENABLED' });

    mockDb.userFindUnique.mockResolvedValue(
      await userRow({ lockedUntil: new Date(now.getTime() + 60_000) }),
    );
    await expect(
      twoFactor.regenerateRecoveryCodes('user-1', { code: validCode }, ctx, now),
    ).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
  });
});
