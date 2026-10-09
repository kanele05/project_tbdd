import { ApiError } from '@/lib/ApiError';
import { hashPassword, verifyPassword } from '@/lib/password';

import type * as LockoutNamespace from './lockout.service';
import type * as OtpNamespace from './otp.service';
import * as passwordService from './password.service';

const mockDb = { findUnique: jest.fn(), update: jest.fn() };
const mockAssertCaptcha = jest.fn();
const mockQueueMail = jest.fn();
const mockRecordAuthEvent = jest.fn();
const mockRegisterFailedAttempt = jest.fn();
const mockResetFailures = jest.fn();
const mockIssueCode = jest.fn();
const mockGetResendWaitSec = jest.fn();
const mockVerifyCode = jest.fn();
const mockRevokeUserSessions = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockDb.findUnique(...args),
      update: (...args: unknown[]) => mockDb.update(...args),
    },
  },
}));
jest.mock('@/lib/captcha', () => ({
  assertCaptcha: (...args: unknown[]) => mockAssertCaptcha(...args),
}));
jest.mock('@/lib/mailer', () => ({ queueMail: (...args: unknown[]) => mockQueueMail(...args) }));
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
  verifyCode: (...args: unknown[]) => mockVerifyCode(...args),
}));
jest.mock('./session.service', () => ({
  revokeUserSessions: (...args: unknown[]) => mockRevokeUserSessions(...args),
}));

const ctx = { ip: '1.2.3.4', userAgent: 'jest', lang: 'en' as const };
const account = { id: 'user-1', email: 'martha@example.com', fullName: 'Martha Rosie' };

beforeEach(() => {
  for (const fn of [
    ...Object.values(mockDb),
    mockAssertCaptcha,
    mockQueueMail,
    mockRecordAuthEvent,
    mockRegisterFailedAttempt,
    mockResetFailures,
    mockIssueCode,
    mockGetResendWaitSec,
    mockVerifyCode,
    mockRevokeUserSessions,
  ]) {
    fn.mockReset();
  }
  mockGetResendWaitSec.mockResolvedValue(0);
  mockIssueCode.mockResolvedValue({ code: '654321', expiresAt: new Date() });
  mockDb.update.mockResolvedValue({ id: 'user-1' });
});

describe('forgotPassword', () => {
  const input = { email: 'martha@example.com', captchaToken: 'cap' };
  const sentResponse = { sent: true, codeExpiresIn: 600, resendAfter: 60 };

  it('verifies the CAPTCHA, creates a RESET_PASSWORD code and emails it', async () => {
    mockDb.findUnique.mockResolvedValue(account);
    await expect(passwordService.forgotPassword(input, ctx)).resolves.toEqual(sentResponse);
    expect(mockAssertCaptcha).toHaveBeenCalledWith('cap', '1.2.3.4');
    expect(mockIssueCode).toHaveBeenCalledWith('user-1', 'RESET_PASSWORD');
    const mail = mockQueueMail.mock.calls[0]?.[0] as { to: string; subject: string; text: string };
    expect(mail.to).toBe('martha@example.com');
    expect(mail.subject).toBe('Reset your E-Learning password');
    expect(mail.text).toContain('654321');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'PASSWORD_RESET_REQUESTED',
      ctx,
    });
  });

  it('gives the identical response for an unknown email and sends nothing', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(passwordService.forgotPassword(input, ctx)).resolves.toEqual(sentResponse);
    expect(mockIssueCode).not.toHaveBeenCalled();
    expect(mockQueueMail).not.toHaveBeenCalled();
  });

  it('silently skips sending during the resend cooldown (still answers 200-style success)', async () => {
    mockDb.findUnique.mockResolvedValue(account);
    mockGetResendWaitSec.mockResolvedValue(30);
    await expect(passwordService.forgotPassword(input, ctx)).resolves.toEqual(sentResponse);
    expect(mockIssueCode).not.toHaveBeenCalled();
    expect(mockQueueMail).not.toHaveBeenCalled();
  });

  it('does nothing when the CAPTCHA fails', async () => {
    mockAssertCaptcha.mockRejectedValue(ApiError.of('CAPTCHA_FAILED', 'captcha'));
    await expect(passwordService.forgotPassword(input, ctx)).rejects.toMatchObject({
      code: 'CAPTCHA_FAILED',
    });
    expect(mockDb.findUnique).not.toHaveBeenCalled();
  });

  it('writes the mail in Vietnamese when the request language is vi', async () => {
    mockDb.findUnique.mockResolvedValue(account);
    await passwordService.forgotPassword(input, { ...ctx, lang: 'vi' });
    expect((mockQueueMail.mock.calls[0]?.[0] as { subject: string }).subject).toBe(
      'Đặt lại mật khẩu E-Learning',
    );
  });
});

describe('resetPassword', () => {
  const input = { email: 'martha@example.com', code: '654321', newPassword: 'NewPass2027' };

  it('sets the new password, verifies the email, unlocks the account and revokes every session', async () => {
    mockDb.findUnique.mockResolvedValue({ ...account, emailVerifiedAt: null });

    await passwordService.resetPassword(input, ctx);

    expect(mockVerifyCode).toHaveBeenCalledWith('user-1', 'RESET_PASSWORD', '654321');
    const data = (mockDb.update.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(await verifyPassword('NewPass2027', data.passwordHash as string)).toBe(true);
    expect(data).toMatchObject({
      emailVerifiedAt: expect.any(Date),
      failedLoginCount: 0,
      lockedUntil: null,
    });
    expect(mockRevokeUserSessions).toHaveBeenCalledWith('user-1', { reason: 'PASSWORD_RESET' });
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'PASSWORD_RESET',
      ctx,
    });
    expect((mockQueueMail.mock.calls[0]?.[0] as { subject: string }).subject).toContain(
      'password was changed',
    );
  });

  it('keeps the original verification date of an already verified account', async () => {
    const verifiedAt = new Date('2026-09-01T00:00:00Z');
    mockDb.findUnique.mockResolvedValue({ ...account, emailVerifiedAt: verifiedAt });
    await passwordService.resetPassword(input, ctx);
    expect(
      (mockDb.update.mock.calls[0]?.[0] as { data: { emailVerifiedAt: Date } }).data
        .emailVerifiedAt,
    ).toBe(verifiedAt);
  });

  it('answers INVALID_CODE for an unknown email without leaking that it does not exist', async () => {
    mockDb.findUnique.mockResolvedValue(null);
    await expect(passwordService.resetPassword(input, ctx)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
    });
  });

  it('changes nothing when the code is wrong', async () => {
    mockDb.findUnique.mockResolvedValue({ ...account, emailVerifiedAt: new Date() });
    mockVerifyCode.mockRejectedValue(ApiError.of('INVALID_CODE', 'Invalid'));
    await expect(passwordService.resetPassword(input, ctx)).rejects.toMatchObject({
      code: 'INVALID_CODE',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockRevokeUserSessions).not.toHaveBeenCalled();
  });
});

describe('changePassword', () => {
  const input = { currentPassword: 'Learn2026', newPassword: 'NewPass2027' };
  async function row(overrides: Record<string, unknown> = {}) {
    return {
      ...account,
      passwordHash: await hashPassword('Learn2026'),
      failedLoginCount: 0,
      lockedUntil: null,
      ...overrides,
    };
  }

  it('stores the new hash, signs out the other devices and emails a notice', async () => {
    mockDb.findUnique.mockResolvedValue(await row());

    await passwordService.changePassword('user-1', 'sess-current', input, ctx);

    const data = (mockDb.update.mock.calls[0]?.[0] as { data: { passwordHash: string } }).data;
    expect(await verifyPassword('NewPass2027', data.passwordHash)).toBe(true);
    expect(mockRevokeUserSessions).toHaveBeenCalledWith('user-1', {
      exceptSessionId: 'sess-current',
      reason: 'PASSWORD_CHANGED',
    });
    expect(mockResetFailures).toHaveBeenCalled();
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'PASSWORD_CHANGED',
      sessionId: 'sess-current',
      ctx,
    });
    expect(mockQueueMail).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong current password with 422 INVALID_PASSWORD and counts a failed attempt', async () => {
    mockDb.findUnique.mockResolvedValue(await row());
    await expect(
      passwordService.changePassword(
        'user-1',
        's',
        { ...input, currentPassword: 'WrongPass1' },
        ctx,
      ),
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_PASSWORD' });
    expect(mockRegisterFailedAttempt).toHaveBeenCalledWith(
      'user-1',
      'LOGIN_FAILED',
      ctx,
      'invalid_current_password',
    );
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockRevokeUserSessions).not.toHaveBeenCalled();
  });

  it('refuses a locked account (423) and a missing account (401)', async () => {
    mockDb.findUnique.mockResolvedValue(await row({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expect(passwordService.changePassword('user-1', 's', input, ctx)).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
    });
    mockDb.findUnique.mockResolvedValue(null);
    await expect(passwordService.changePassword('gone', 's', input, ctx)).rejects.toMatchObject({
      status: 401,
    });
  });
});
