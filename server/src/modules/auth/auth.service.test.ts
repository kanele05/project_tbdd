import { ApiError } from '@/lib/ApiError';
import { signAccessToken, signChallengeToken, verifyChallengeToken, verifyToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

import * as authService from './auth.service';
import type * as LockoutNamespace from './lockout.service';
import type * as OtpNamespace from './otp.service';

const mockDb = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockAssertCaptcha = jest.fn();
const mockQueueMail = jest.fn();
const mockNotify = jest.fn();
const mockRecordAuthEvent = jest.fn();
const mockRegisterFailedAttempt = jest.fn();
const mockResetFailures = jest.fn();
const mockIssueCode = jest.fn();
const mockGetResendWaitSec = jest.fn();
const mockHasPendingCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockStartSession = jest.fn();
const mockVerifySecondFactor = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockDb.findUnique(...args),
      create: (...args: unknown[]) => mockDb.create(...args),
      update: (...args: unknown[]) => mockDb.update(...args),
    },
  },
  Prisma: jest.requireActual('@/generated/prisma/client').Prisma,
}));
jest.mock('@/lib/turnstile', () => ({
  assertCaptcha: (...args: unknown[]) => mockAssertCaptcha(...args),
}));
jest.mock('@/lib/mailer', () => ({ queueMail: (...args: unknown[]) => mockQueueMail(...args) }));
jest.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => mockNotify(...args) }));
jest.mock('./authEvent.service', () => ({
  recordAuthEvent: (...args: unknown[]) => mockRecordAuthEvent(...args),
}));
jest.mock('./lockout.service', () => ({
  ...jest.requireActual<typeof LockoutNamespace>('./lockout.service'),
  registerFailedAttempt: (...args: unknown[]) => mockRegisterFailedAttempt(...args),
  resetFailures: (...args: unknown[]) => mockResetFailures(...args),
}));
jest.mock('./otp.service', () => ({
  ...jest.requireActual<typeof OtpNamespace>('./otp.service'),
  issueCode: (...args: unknown[]) => mockIssueCode(...args),
  getResendWaitSec: (...args: unknown[]) => mockGetResendWaitSec(...args),
  hasPendingCode: (...args: unknown[]) => mockHasPendingCode(...args),
  verifyCode: (...args: unknown[]) => mockVerifyCode(...args),
}));
jest.mock('./session.service', () => ({
  startSession: (...args: unknown[]) => mockStartSession(...args),
}));
jest.mock('./twoFactor.service', () => ({
  verifySecondFactor: (...args: unknown[]) => mockVerifySecondFactor(...args),
}));

const ctx = { ip: '1.2.3.4', userAgent: 'jest', lang: 'en' as const };
const publicUser = {
  id: 'user-1',
  email: 'martha@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT' as const,
};

let counter = 0;
/** Email duy nhất mỗi test: bộ đếm "email không tồn tại" nằm trong bộ nhớ và dùng chung giữa các test. */
const uniqueEmail = () => `nobody-${(counter += 1)}-${Date.now()}@example.com`;

async function loginRow(overrides: Record<string, unknown> = {}) {
  return {
    ...publicUser,
    passwordHash: await hashPassword('Learn2026'),
    emailVerifiedAt: new Date('2026-09-01T00:00:00Z'),
    failedLoginCount: 0,
    lockedUntil: null,
    totpEnabledAt: null,
    totpSecretEnc: null,
    totpLastStep: null,
    ...overrides,
  };
}

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresIn: 900,
  token: 'access-token',
};

beforeEach(() => {
  for (const fn of [
    ...Object.values(mockDb),
    mockAssertCaptcha,
    mockQueueMail,
    mockNotify,
    mockRecordAuthEvent,
    mockRegisterFailedAttempt,
    mockResetFailures,
    mockIssueCode,
    mockGetResendWaitSec,
    mockHasPendingCode,
    mockVerifyCode,
    mockStartSession,
    mockVerifySecondFactor,
  ]) {
    fn.mockReset();
  }
  mockIssueCode.mockResolvedValue({ code: '123456', expiresAt: new Date() });
  mockGetResendWaitSec.mockResolvedValue(0);
  mockHasPendingCode.mockResolvedValue(true);
  mockRegisterFailedAttempt.mockResolvedValue({
    failedCount: 1,
    lockedUntil: null,
    justLocked: false,
  });
  mockStartSession.mockResolvedValue({
    sessionId: 'sess-1',
    tokens,
    deviceName: 'Pixel 8',
    isNewDevice: false,
  });
});

describe('authService.register', () => {
  const input = { fullName: 'Martha Rosie', email: 'martha@example.com', password: 'Learn2026' };

  it('creates an unverified STUDENT, emails the OTP and does NOT return a token', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    mockDb.create.mockResolvedValue(publicUser);

    const result = await authService.register({ ...input, captchaToken: 'cap' }, ctx);

    expect(mockAssertCaptcha).toHaveBeenCalledWith('cap', '1.2.3.4');
    const createArgs = mockDb.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string; role: string; emailVerifiedAt?: unknown };
    };
    expect(createArgs.data.role).toBe('STUDENT');
    expect(createArgs.data.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(createArgs.data.passwordHash).not.toContain('Learn2026');
    expect(createArgs.data.emailVerifiedAt).toBeUndefined();

    expect(result).toEqual({
      user: publicUser,
      emailVerificationRequired: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('accessToken');

    expect(mockIssueCode).toHaveBeenCalledWith('user-1', 'VERIFY_EMAIL');
    const mail = mockQueueMail.mock.calls[0]?.[0] as { to: string; subject: string; text: string };
    expect(mail.to).toBe('martha@example.com');
    expect(mail.text).toContain('123456');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({ userId: 'user-1', type: 'REGISTER', ctx });
  });

  it('writes the verification mail in the request language', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    mockDb.create.mockResolvedValue(publicUser);
    await authService.register(input, { ...ctx, lang: 'vi' });
    expect((mockQueueMail.mock.calls[0]?.[0] as { subject: string }).subject).toContain(
      'Xác minh email',
    );
  });

  it('stops at the CAPTCHA check (nothing is created or sent)', async () => {
    mockAssertCaptcha.mockRejectedValue(ApiError.of('CAPTCHA_REQUIRED', 'captcha'));
    await expect(authService.register(input, ctx)).rejects.toMatchObject({
      code: 'CAPTCHA_REQUIRED',
    });
    expect(mockDb.findUnique).not.toHaveBeenCalled();
    expect(mockDb.create).not.toHaveBeenCalled();
    expect(mockQueueMail).not.toHaveBeenCalled();
  });

  it('throws 409 EMAIL_TAKEN when the email already exists', async () => {
    mockDb.findUnique.mockResolvedValue({ id: 'someone' });
    await expect(authService.register(input, ctx)).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
    expect(mockDb.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation (P2002) to EMAIL_TAKEN and rethrows other errors', async () => {
    const { Prisma } = jest.requireActual('@/generated/prisma/client');
    mockDb.findUnique.mockResolvedValue(null);
    mockDb.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(authService.register(input, ctx)).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });

    const boom = new Error('connection lost');
    mockDb.create.mockRejectedValueOnce(boom);
    await expect(authService.register(input, ctx)).rejects.toBe(boom);
  });
});

describe('authService.login', () => {
  const input = { email: 'martha@example.com', password: 'Learn2026' };

  it('returns the token pair and user when the credentials are correct', async () => {
    const row = await loginRow();
    mockDb.findUnique.mockResolvedValue(row);

    const result = await authService.login({ ...input, deviceName: 'Pixel 8' }, ctx);

    expect(result).toEqual({ twoFactorRequired: false, ...tokens, user: publicUser });
    expect(result).not.toHaveProperty('passwordHash');
    expect(mockStartSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      ctx,
      'Pixel 8',
    );
    expect(mockResetFailures).toHaveBeenCalledWith(row);
    expect(mockAssertCaptcha).not.toHaveBeenCalled();
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'LOGIN_SUCCESS',
      sessionId: 'sess-1',
      ctx,
      metadata: { method: 'password' },
    });
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockQueueMail).not.toHaveBeenCalled();
  });

  it('throws 401 INVALID_CREDENTIALS for a wrong password and counts the failure', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow());
    await expect(
      authService.login({ ...input, password: 'WrongPass1' }, ctx),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password',
      details: { captchaRequired: false },
    });
    expect(mockRegisterFailedAttempt).toHaveBeenCalledWith(
      'user-1',
      'LOGIN_FAILED',
      ctx,
      'invalid_password',
    );
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('asks the client for a CAPTCHA once the failed count reaches 3', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow());
    mockRegisterFailedAttempt.mockResolvedValue({
      failedCount: 3,
      lockedUntil: null,
      justLocked: false,
    });
    await expect(
      authService.login({ ...input, password: 'WrongPass1' }, ctx),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      details: { captchaRequired: true },
    });
  });

  it('returns the same error for an unknown email (no hint that the account does not exist)', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    const error = await authService
      .login({ email: uniqueEmail(), password: 'Learn2026' }, ctx)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password',
      details: { captchaRequired: false },
    });
    expect(mockRegisterFailedAttempt).not.toHaveBeenCalled();
  });

  it('applies the same CAPTCHA and lock policy to an unknown email', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    const email = uniqueEmail();
    const attempt = (captchaToken?: string) =>
      authService
        .login({ email, password: 'Learn2026', captchaToken }, ctx)
        .catch((e: unknown) => e);

    for (let i = 1; i <= 2; i += 1) {
      expect(await attempt()).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        details: { captchaRequired: false },
      });
    }
    // lần sai thứ 3: báo cần CAPTCHA
    expect(await attempt()).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      details: { captchaRequired: true },
    });
    expect(mockAssertCaptcha).not.toHaveBeenCalled();
    // lần thứ 4 phải kèm CAPTCHA
    expect(await attempt('cap')).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(mockAssertCaptcha).toHaveBeenCalledWith('cap', '1.2.3.4');
    // lần thứ 5 -> khóa
    expect(await attempt('cap')).toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
    // đang khóa: chặn ngay, không đụng tới CAPTCHA nữa
    mockAssertCaptcha.mockClear();
    expect(await attempt('cap')).toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      details: { retryAfterSec: expect.any(Number) },
    });
    expect(mockAssertCaptcha).not.toHaveBeenCalled();
  });

  it('refuses a locked account with 423 before even checking the password', async () => {
    mockDb.findUnique.mockResolvedValue(
      await loginRow({ lockedUntil: new Date(Date.now() + 10 * 60_000) }),
    );
    await expect(authService.login(input, ctx)).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      details: { retryAfterSec: expect.any(Number) },
    });
    expect(mockRegisterFailedAttempt).not.toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('lets a user in again once the lock has expired', async () => {
    mockDb.findUnique.mockResolvedValue(
      await loginRow({ lockedUntil: new Date(Date.now() - 1000) }),
    );
    await expect(authService.login(input, ctx)).resolves.toMatchObject({
      twoFactorRequired: false,
    });
  });

  it('propagates the lock raised by the failed attempt that reached the limit', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow({ failedLoginCount: 4 }));
    mockRegisterFailedAttempt.mockRejectedValue(
      ApiError.of('ACCOUNT_LOCKED', 'locked', { retryAfterSec: 900 }),
    );
    await expect(
      authService.login({ ...input, password: 'WrongPass1', captchaToken: 'cap' }, ctx),
    ).rejects.toMatchObject({
      status: 423,
    });
  });

  it('requires a CAPTCHA from the 3rd failure onwards, before verifying the password', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow({ failedLoginCount: 3 }));
    mockAssertCaptcha.mockRejectedValue(
      ApiError.of('CAPTCHA_REQUIRED', 'captcha', { captchaRequired: true }),
    );
    await expect(authService.login(input, ctx)).rejects.toMatchObject({
      status: 400,
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockRegisterFailedAttempt).not.toHaveBeenCalled();

    mockAssertCaptcha.mockReset();
    await expect(authService.login({ ...input, captchaToken: 'cap' }, ctx)).resolves.toMatchObject({
      twoFactorRequired: false,
    });
    expect(mockAssertCaptcha).toHaveBeenCalledWith('cap', '1.2.3.4');
  });

  it('returns 403 EMAIL_NOT_VERIFIED (with the email and resend delay) and keeps the pending code', async () => {
    mockDb.findUnique.mockResolvedValue(
      await loginRow({ emailVerifiedAt: null, failedLoginCount: 1 }),
    );
    mockGetResendWaitSec.mockResolvedValue(42);

    await expect(authService.login(input, ctx)).rejects.toMatchObject({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      details: { email: 'martha@example.com', resendAfter: 42 },
    });
    expect(mockIssueCode).not.toHaveBeenCalled();
    expect(mockResetFailures).toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('sends a fresh verification code when the unverified user has no pending one', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow({ emailVerifiedAt: null }));
    mockHasPendingCode.mockResolvedValue(false);
    await expect(authService.login(input, ctx)).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
    });
    expect(mockIssueCode).toHaveBeenCalledWith('user-1', 'VERIFY_EMAIL');
    expect(mockQueueMail).toHaveBeenCalledTimes(1);
  });

  it('returns a 5 minute challenge for 2FA accounts, without a session and without clearing the failure count', async () => {
    mockDb.findUnique.mockResolvedValue(
      await loginRow({ totpEnabledAt: new Date(), failedLoginCount: 2 }),
    );
    const result = await authService.login(input, ctx);
    expect(result).toEqual({
      twoFactorRequired: true,
      challengeToken: expect.any(String),
      challengeExpiresIn: 300,
    });
    if (!result.twoFactorRequired) throw new Error('expected a challenge');
    expect(verifyChallengeToken(result.challengeToken)).toBe('user-1');
    expect(verifyToken(result.challengeToken)).toBeNull();
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockResetFailures).not.toHaveBeenCalled();
  });

  it('alerts the user (in-app notification + email + event) when signing in from a new device', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow());
    mockStartSession.mockResolvedValue({
      sessionId: 'sess-2',
      tokens,
      deviceName: 'Pixel 8',
      isNewDevice: true,
    });

    await authService.login(input, ctx);

    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'NEW_DEVICE_LOGIN',
      sessionId: 'sess-2',
      ctx,
      metadata: { deviceName: 'Pixel 8' },
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        type: 'SYSTEM',
        body: expect.stringContaining('Pixel 8'),
      }),
    );
    const mail = mockQueueMail.mock.calls[0]?.[0] as { to: string; subject: string; text: string };
    expect(mail.to).toBe('martha@example.com');
    expect(mail.subject).toContain('New sign-in');
    expect(mail.text).toContain('Pixel 8');
    expect(mail.text).toContain('1.2.3.x');
    expect(mail.text).not.toContain('1.2.3.4');
  });

  it('still signs in when the in-app notification cannot be created', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow());
    mockStartSession.mockResolvedValue({
      sessionId: 'sess-2',
      tokens,
      deviceName: 'Pixel 8',
      isNewDevice: true,
    });
    mockNotify.mockRejectedValue(new Error('db'));
    await expect(authService.login(input, ctx)).resolves.toMatchObject({
      twoFactorRequired: false,
    });
    expect(mockQueueMail).toHaveBeenCalled();
  });
});

describe('authService.verifyTwoFactorLogin', () => {
  const challenge = () => signChallengeToken('user-1');
  const enabledUser = () => loginRow({ totpEnabledAt: new Date(), totpSecretEnc: 'enc' });

  it('issues the session after a valid TOTP code and resets the failure counter', async () => {
    mockDb.findUnique.mockResolvedValue(await enabledUser());
    mockVerifySecondFactor.mockResolvedValue('totp');

    const result = await authService.verifyTwoFactorLogin(
      { challengeToken: challenge(), code: '123456', deviceName: 'Pixel 8' },
      ctx,
    );

    expect(result).toEqual({ twoFactorRequired: false, ...tokens, user: publicUser });
    expect(mockVerifySecondFactor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      expect.objectContaining({ code: '123456' }),
    );
    expect(mockResetFailures).toHaveBeenCalled();
    expect(mockStartSession).toHaveBeenCalledWith(expect.anything(), ctx, 'Pixel 8');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOGIN_SUCCESS', metadata: { method: 'totp' } }),
    );
  });

  it('accepts a recovery code and logs that it was used', async () => {
    mockDb.findUnique.mockResolvedValue(await enabledUser());
    mockVerifySecondFactor.mockResolvedValue('recovery');
    await authService.verifyTwoFactorLogin(
      { challengeToken: challenge(), recoveryCode: 'ABCDE-FGHJK' },
      ctx,
    );
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'RECOVERY_CODE_USED',
      ctx,
    });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOGIN_SUCCESS', metadata: { method: 'recovery_code' } }),
    );
  });

  it('counts a wrong code as a failed attempt and reports how many are left', async () => {
    mockDb.findUnique.mockResolvedValue(await enabledUser());
    mockVerifySecondFactor.mockResolvedValue(null);
    mockRegisterFailedAttempt.mockResolvedValue({
      failedCount: 2,
      lockedUntil: null,
      justLocked: false,
    });
    await expect(
      authService.verifyTwoFactorLogin({ challengeToken: challenge(), code: '000000' }, ctx),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_CODE', details: { attemptsLeft: 3 } });
    expect(mockRegisterFailedAttempt).toHaveBeenCalledWith(
      'user-1',
      'TWO_FACTOR_FAILED',
      ctx,
      'invalid_code',
    );
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('rejects an invalid, expired or wrong-type challenge with 401 INVALID_CHALLENGE', async () => {
    for (const challengeToken of [
      'garbage',
      signAccessToken({ id: 'user-1', role: 'STUDENT', sessionId: 's' }),
    ]) {
      await expect(
        authService.verifyTwoFactorLogin({ challengeToken, code: '123456' }, ctx),
      ).rejects.toMatchObject({ status: 401, code: 'INVALID_CHALLENGE' });
    }
    expect(mockDb.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a challenge for a missing user or a user without 2FA', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(
      authService.verifyTwoFactorLogin({ challengeToken: challenge(), code: '123456' }, ctx),
    ).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' });
    mockDb.findUnique.mockResolvedValue(await loginRow());
    await expect(
      authService.verifyTwoFactorLogin({ challengeToken: challenge(), code: '123456' }, ctx),
    ).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' });
  });

  it('refuses while the account is locked (423)', async () => {
    mockDb.findUnique.mockResolvedValue(
      await loginRow({ totpEnabledAt: new Date(), lockedUntil: new Date(Date.now() + 60_000) }),
    );
    await expect(
      authService.verifyTwoFactorLogin({ challengeToken: challenge(), code: '123456' }, ctx),
    ).rejects.toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
    expect(mockVerifySecondFactor).not.toHaveBeenCalled();
  });
});

describe('authService.verifyEmail', () => {
  const input = { email: 'martha@example.com', code: '123456' };

  it('verifies the OTP, marks the email verified and signs the user in', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow({ emailVerifiedAt: null }));
    mockDb.update.mockResolvedValue({ id: 'user-1' });

    const result = await authService.verifyEmail({ ...input, deviceName: 'Pixel 8' }, ctx);

    expect(mockVerifyCode).toHaveBeenCalledWith('user-1', 'VERIFY_EMAIL', '123456');
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailVerifiedAt: expect.any(Date) },
      select: { id: true },
    });
    expect(result).toEqual({ twoFactorRequired: false, ...tokens, user: publicUser });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'EMAIL_VERIFIED',
      ctx,
    });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOGIN_SUCCESS',
        metadata: { method: 'email_verification' },
      }),
    );
  });

  it('answers INVALID_CODE for an unknown email', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(authService.verifyEmail(input, ctx)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
    });
  });

  it('answers 409 ALREADY_VERIFIED for a verified account', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow());
    await expect(authService.verifyEmail(input, ctx)).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_VERIFIED',
    });
    expect(mockVerifyCode).not.toHaveBeenCalled();
  });

  it('does not verify the email when the code is wrong', async () => {
    mockDb.findUnique.mockResolvedValue(await loginRow({ emailVerifiedAt: null }));
    mockVerifyCode.mockRejectedValue(ApiError.of('INVALID_CODE', 'Invalid'));
    await expect(authService.verifyEmail(input, ctx)).rejects.toMatchObject({
      code: 'INVALID_CODE',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});

describe('authService.resendVerification', () => {
  const input = { email: 'martha@example.com' };
  const unverified = {
    id: 'user-1',
    email: 'martha@example.com',
    fullName: 'Martha Rosie',
    emailVerifiedAt: null,
  };

  it('sends a new code to an unverified account', async () => {
    mockDb.findUnique.mockResolvedValue(unverified);
    await expect(authService.resendVerification(input, ctx)).resolves.toEqual({
      sent: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    expect(mockIssueCode).toHaveBeenCalledWith('user-1', 'VERIFY_EMAIL');
    expect((mockQueueMail.mock.calls[0]?.[0] as { to: string }).to).toBe('martha@example.com');
  });

  it('pretends success (no mail) for unknown emails and verified accounts', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(authService.resendVerification(input, ctx)).resolves.toMatchObject({ sent: true });
    mockDb.findUnique.mockResolvedValue({ ...unverified, emailVerifiedAt: new Date() });
    await expect(authService.resendVerification(input, ctx)).resolves.toMatchObject({ sent: true });
    expect(mockIssueCode).not.toHaveBeenCalled();
    expect(mockQueueMail).not.toHaveBeenCalled();
  });

  it('throws 429 RESEND_TOO_SOON with retryAfterSec during the 60 second cooldown', async () => {
    mockDb.findUnique.mockResolvedValue(unverified);
    mockGetResendWaitSec.mockResolvedValue(37);
    await expect(authService.resendVerification(input, ctx)).rejects.toMatchObject({
      status: 429,
      code: 'RESEND_TOO_SOON',
      details: { retryAfterSec: 37 },
    });
    expect(mockIssueCode).not.toHaveBeenCalled();
  });
});

describe('authService.getMe', () => {
  it('returns the user', async () => {
    mockDb.findUnique.mockResolvedValue(publicUser);
    await expect(authService.getMe('user-1')).resolves.toEqual(publicUser);
  });

  it('throws 401 UNAUTHORIZED when the account no longer exists', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(authService.getMe('gone')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });
});
