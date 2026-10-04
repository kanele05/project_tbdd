import { hashOtp } from '@/lib/authCrypto';

import * as otpService from './otp.service';

const mockDb = {
  deleteMany: jest.fn(),
  create: jest.fn(),
  findFirst: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    oneTimeCode: {
      deleteMany: (...args: unknown[]) => mockDb.deleteMany(...args),
      create: (...args: unknown[]) => mockDb.create(...args),
      findFirst: (...args: unknown[]) => mockDb.findFirst(...args),
      count: (...args: unknown[]) => mockDb.count(...args),
      update: (...args: unknown[]) => mockDb.update(...args),
      updateMany: (...args: unknown[]) => mockDb.updateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockDb.transaction(...args),
  },
}));

const now = new Date('2026-10-04T08:00:00Z');
const USER = 'user-1';

function storedCode(code: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'otp-1',
    userId: USER,
    purpose: 'VERIFY_EMAIL',
    codeHash: hashOtp(USER, 'VERIFY_EMAIL', code),
    expiresAt: new Date(now.getTime() + 5 * 60_000),
    attempts: 0,
    consumedAt: null,
    createdAt: new Date(now.getTime() - 60_000),
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(mockDb).forEach((fn) => fn.mockReset());
  mockDb.transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
});

describe('issueCode', () => {
  it('replaces older codes, stores only the HMAC and expires in 10 minutes', async () => {
    mockDb.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.create.mockResolvedValue({ id: 'otp-2' });

    const { code, expiresAt } = await otpService.issueCode(USER, 'VERIFY_EMAIL', now);

    expect(code).toMatch(/^\d{6}$/);
    expect(expiresAt).toEqual(new Date(now.getTime() + 600_000));
    expect(mockDb.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, purpose: 'VERIFY_EMAIL' },
    });
    const data = (mockDb.create.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.codeHash).toBe(hashOtp(USER, 'VERIFY_EMAIL', code));
    expect(JSON.stringify(data)).not.toContain(`"${code}"`);
  });
});

describe('getResendWaitSec', () => {
  it('is 0 when no code was ever sent', async () => {
    mockDb.findFirst.mockResolvedValue(null);
    await expect(otpService.getResendWaitSec(USER, 'VERIFY_EMAIL', now)).resolves.toBe(0);
  });

  it('returns the remaining cooldown, rounded up, and 0 once 60 seconds have passed', async () => {
    mockDb.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 20_500) });
    await expect(otpService.getResendWaitSec(USER, 'VERIFY_EMAIL', now)).resolves.toBe(40);
    mockDb.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 60_000) });
    await expect(otpService.getResendWaitSec(USER, 'VERIFY_EMAIL', now)).resolves.toBe(0);
    mockDb.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 90_000) });
    await expect(otpService.getResendWaitSec(USER, 'VERIFY_EMAIL', now)).resolves.toBe(0);
  });
});

describe('hasPendingCode', () => {
  it('counts only unconsumed, unexpired codes', async () => {
    mockDb.count.mockResolvedValue(1);
    await expect(otpService.hasPendingCode(USER, 'VERIFY_EMAIL', now)).resolves.toBe(true);
    expect(mockDb.count).toHaveBeenCalledWith({
      where: { userId: USER, purpose: 'VERIFY_EMAIL', consumedAt: null, expiresAt: { gt: now } },
    });
    mockDb.count.mockResolvedValue(0);
    await expect(otpService.hasPendingCode(USER, 'VERIFY_EMAIL', now)).resolves.toBe(false);
  });
});

describe('verifyCode', () => {
  it('consumes the code when it matches', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456'));
    mockDb.update.mockResolvedValue({ attempts: 1 });
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now),
    ).resolves.toBeUndefined();
    expect(mockDb.updateMany).toHaveBeenCalledWith({
      where: { id: 'otp-1', consumedAt: null },
      data: { consumedAt: now },
    });
  });

  it('throws 400 INVALID_CODE when no pending code exists', async () => {
    mockDb.findFirst.mockResolvedValue(null);
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('throws 400 CODE_EXPIRED for an expired code without spending an attempt', async () => {
    mockDb.findFirst.mockResolvedValue(
      storedCode('123456', { expiresAt: new Date(now.getTime() - 1) }),
    );
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now)).rejects.toMatchObject({
      status: 400,
      code: 'CODE_EXPIRED',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_CODE with attemptsLeft for a wrong code', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456', { attempts: 1 }));
    mockDb.update.mockResolvedValue({ attempts: 2 });
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '000000', now)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
      details: { attemptsLeft: 3 },
    });
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    expect(mockDb.updateMany).not.toHaveBeenCalled();
  });

  it('burns the code with 429 TOO_MANY_ATTEMPTS on the 5th wrong try', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456', { attempts: 4 }));
    mockDb.update.mockResolvedValue({ attempts: 5 });
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '000000', now)).rejects.toMatchObject({
      status: 429,
      code: 'TOO_MANY_ATTEMPTS',
    });
  });

  it('rejects even the correct code once 5 attempts were used', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456', { attempts: 5 }));
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now)).rejects.toMatchObject({
      status: 429,
      code: 'TOO_MANY_ATTEMPTS',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('does not let parallel requests exceed the attempt limit (counter incremented before comparing)', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456', { attempts: 4 }));
    mockDb.update.mockResolvedValue({ attempts: 6 });
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now)).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });
    expect(mockDb.updateMany).not.toHaveBeenCalled();
  });

  it('loses the race when another request already consumed the code', async () => {
    mockDb.findFirst.mockResolvedValue(storedCode('123456'));
    mockDb.update.mockResolvedValue({ attempts: 1 });
    mockDb.updateMany.mockResolvedValue({ count: 0 });
    await expect(otpService.verifyCode(USER, 'VERIFY_EMAIL', '123456', now)).rejects.toMatchObject({
      code: 'INVALID_CODE',
    });
  });

  it('only looks at the latest unconsumed code of the same purpose', async () => {
    mockDb.findFirst.mockResolvedValue(null);
    await otpService.verifyCode(USER, 'RESET_PASSWORD', '123456', now).catch(() => undefined);
    expect(mockDb.findFirst).toHaveBeenCalledWith({
      where: { userId: USER, purpose: 'RESET_PASSWORD', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });
});
