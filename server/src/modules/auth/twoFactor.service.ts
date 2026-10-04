/**
 * 2FA TOTP (AUTH-04): bật/tắt, mã khôi phục, và kiểm tra yếu tố thứ hai khi đăng nhập.
 *  - Secret 160 bit, lưu mã hóa AES-256-GCM (`totpSecretEnc`); chưa bật khi `totpEnabledAt = null`.
 *  - Mã TOTP chỉ dùng được một lần (lưu `totpLastStep`), chấp nhận lệch ±1 bước 30 s.
 *  - 10 mã khôi phục dùng một lần, DB chỉ lưu HMAC; hiện thô đúng 1 lần.
 */
import { ApiError } from '@/lib/ApiError';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from '@/lib/authCrypto';
import { APP_NAME } from '@/lib/mailTemplates';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from '@/lib/totp';
import type { ClientContext } from '@/types/auth';
import type { RecoveryCodesDto, SecurityOverviewDto, TwoFactorSetupDto } from '@/types/dto';

import { recordAuthEvent } from './authEvent.service';
import { assertNotLocked, registerFailedAttempt, resetFailures, stateOf } from './lockout.service';

export const RECOVERY_CODE_COUNT = 10;

export type SecondFactorInput = { code?: string; recoveryCode?: string };
export type SecondFactorMethod = 'totp' | 'recovery';

type TotpUserRow = {
  id: string;
  totpSecretEnc: string | null;
  totpLastStep: number | null;
};

/**
 * Kiểm tra yếu tố thứ hai: `code` (TOTP) hoặc `recoveryCode`. Trả cách đã khớp hoặc `null`.
 * Mã đã dùng không dùng lại được: TOTP bằng `UPDATE ... WHERE totpLastStep < step` (atomic), mã khôi phục bằng
 * `UPDATE ... WHERE usedAt IS NULL`.
 */
export async function verifySecondFactor(
  user: TotpUserRow,
  input: SecondFactorInput,
  now = new Date(),
): Promise<SecondFactorMethod | null> {
  if (input.code !== undefined) {
    if (!user.totpSecretEnc) return null;
    const step = verifyTotp(decryptSecret(user.totpSecretEnc), input.code, {
      nowMs: now.getTime(),
      lastStep: user.totpLastStep,
    });
    if (step === null) return null;
    const claim = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return claim.count === 1 ? 'totp' : null;
  }
  if (input.recoveryCode !== undefined) {
    const normalized = normalizeRecoveryCode(input.recoveryCode);
    if (!normalized) return null;
    const claim = await prisma.recoveryCode.updateMany({
      where: { userId: user.id, codeHash: hashRecoveryCode(user.id, normalized), usedAt: null },
      data: { usedAt: now },
    });
    return claim.count === 1 ? 'recovery' : null;
  }
  return null;
}

const securityUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  emailVerifiedAt: true,
  totpSecretEnc: true,
  totpEnabledAt: true,
  totpLastStep: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: securityUserSelect,
  });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user;
}

export async function getSecurityOverview(userId: string): Promise<SecurityOverviewDto> {
  const user = await loadUser(userId);
  const twoFactorEnabled = user.totpEnabledAt !== null;
  const recoveryCodesRemaining = twoFactorEnabled
    ? await prisma.recoveryCode.count({ where: { userId, usedAt: null } })
    : 0;
  return {
    emailVerified: user.emailVerifiedAt !== null,
    twoFactorEnabled,
    recoveryCodesRemaining,
  };
}

/** Bước 1: tạo secret mới (chưa bật). Gọi lại sẽ thay secret chờ xác nhận bằng secret khác. */
export async function setupTwoFactor(userId: string): Promise<TwoFactorSetupDto> {
  const user = await loadUser(userId);
  if (user.totpEnabledAt) {
    throw ApiError.of('TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled');
  }
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecretEnc: encryptSecret(secret), totpLastStep: null },
    select: { id: true },
  });
  return {
    secret,
    otpauthUrl: buildOtpauthUrl({ secret, accountName: user.email, issuer: APP_NAME }),
  };
}

async function replaceRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({
      data: codes.map((code) => ({
        userId,
        codeHash: hashRecoveryCode(userId, normalizeRecoveryCode(code) ?? code),
      })),
    }),
  ]);
  return codes;
}

/** Bước 2: nhập mã từ app Authenticator để bật 2FA; trả 10 mã khôi phục (chỉ hiện lần này). */
export async function enableTwoFactor(
  userId: string,
  code: string,
  ctx: ClientContext,
  now = new Date(),
): Promise<RecoveryCodesDto> {
  const user = await loadUser(userId);
  if (user.totpEnabledAt) {
    throw ApiError.of('TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled');
  }
  if (!user.totpSecretEnc) {
    throw ApiError.of('TWO_FACTOR_NOT_SETUP', 'Start two-factor setup first');
  }
  const step = verifyTotp(decryptSecret(user.totpSecretEnc), code, { nowMs: now.getTime() });
  if (step === null) throw ApiError.of('INVALID_CODE', 'Invalid verification code');

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabledAt: now, totpLastStep: step },
    select: { id: true },
  });
  const recoveryCodes = await replaceRecoveryCodes(userId);
  await recordAuthEvent({ userId, type: 'TWO_FACTOR_ENABLED', ctx });
  return { recoveryCodes };
}

/** Xác minh lại danh tính bằng yếu tố thứ hai cho thao tác nhạy cảm; sai thì tính vào bộ đếm khóa. */
async function requireSecondFactor(
  user: Awaited<ReturnType<typeof loadUser>>,
  input: SecondFactorInput,
  ctx: ClientContext,
  now: Date,
): Promise<void> {
  const method = await verifySecondFactor(user, input, now);
  if (!method) {
    await registerFailedAttempt(user.id, 'TWO_FACTOR_FAILED', ctx, 'invalid_second_factor');
    throw ApiError.of('INVALID_CODE', 'Invalid verification code');
  }
  if (method === 'recovery') {
    await recordAuthEvent({ userId: user.id, type: 'RECOVERY_CODE_USED', ctx });
  }
}

/** Tắt 2FA: cần mật khẩu + mã TOTP/mã khôi phục. Xóa secret và toàn bộ mã khôi phục. */
export async function disableTwoFactor(
  userId: string,
  input: SecondFactorInput & { password: string },
  ctx: ClientContext,
  now = new Date(),
): Promise<void> {
  const user = await loadUser(userId);
  assertNotLocked(stateOf(user), now);
  if (!user.totpEnabledAt) {
    throw ApiError.of('TWO_FACTOR_NOT_ENABLED', 'Two-factor authentication is not enabled');
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await registerFailedAttempt(user.id, 'LOGIN_FAILED', ctx, 'invalid_password');
    throw ApiError.of('INVALID_PASSWORD', 'Incorrect password');
  }
  await requireSecondFactor(user, input, ctx, now);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null },
      select: { id: true },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
  ]);
  await resetFailures(user);
  await recordAuthEvent({ userId, type: 'TWO_FACTOR_DISABLED', ctx });
}

/** Tạo lại 10 mã khôi phục (mã cũ vô hiệu); cần mã TOTP hoặc một mã khôi phục còn dùng được. */
export async function regenerateRecoveryCodes(
  userId: string,
  input: SecondFactorInput,
  ctx: ClientContext,
  now = new Date(),
): Promise<RecoveryCodesDto> {
  const user = await loadUser(userId);
  assertNotLocked(stateOf(user), now);
  if (!user.totpEnabledAt) {
    throw ApiError.of('TWO_FACTOR_NOT_ENABLED', 'Two-factor authentication is not enabled');
  }
  await requireSecondFactor(user, input, ctx, now);
  const recoveryCodes = await replaceRecoveryCodes(userId);
  await resetFailures(user);
  await recordAuthEvent({ userId, type: 'RECOVERY_CODES_REGENERATED', ctx });
  return { recoveryCodes };
}
