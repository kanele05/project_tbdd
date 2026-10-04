/**
 * Quên / đặt lại / đổi mật khẩu (AUTH-03).
 *  - `forgotPassword` luôn trả 200 như nhau dù email có tồn tại hay không (không lộ email đã đăng ký).
 *  - Đặt lại / đổi mật khẩu thành công -> thu hồi phiên (đặt lại: mọi phiên; đổi: mọi phiên TRỪ phiên hiện tại).
 */
import { ApiError } from '@/lib/ApiError';
import { queueMail } from '@/lib/mailer';
import { passwordChangedMail, resetPasswordMail } from '@/lib/mailTemplates';
import { hashPassword, verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { assertCaptcha } from '@/lib/turnstile';
import type { ClientContext } from '@/types/auth';
import type { SentCodeDto } from '@/types/dto';

import type { ForgotPasswordInput, ResetPasswordInput } from './auth.schema';
import { recordAuthEvent } from './authEvent.service';
import { assertNotLocked, registerFailedAttempt, resetFailures, stateOf } from './lockout.service';
import {
  getResendWaitSec,
  issueCode,
  OTP_RESEND_COOLDOWN_SEC,
  OTP_TTL_SEC,
  verifyCode,
} from './otp.service';
import { revokeUserSessions } from './session.service';

export async function forgotPassword(
  input: ForgotPasswordInput,
  ctx: ClientContext,
): Promise<SentCodeDto> {
  await assertCaptcha(input.captchaToken, ctx.ip);
  const response: SentCodeDto = {
    sent: true,
    codeExpiresIn: OTP_TTL_SEC,
    resendAfter: OTP_RESEND_COOLDOWN_SEC,
  };

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) return response;
  // Còn trong thời gian chờ: im lặng bỏ qua (vẫn trả 200) để không bị dùng làm công cụ spam hộp thư.
  if ((await getResendWaitSec(user.id, 'RESET_PASSWORD')) > 0) return response;

  const { code } = await issueCode(user.id, 'RESET_PASSWORD');
  queueMail({
    to: user.email,
    ...resetPasswordMail(ctx.lang, {
      fullName: user.fullName,
      code,
      ttlMinutes: OTP_TTL_SEC / 60,
    }),
  });
  await recordAuthEvent({ userId: user.id, type: 'PASSWORD_RESET_REQUESTED', ctx });
  return response;
}

/**
 * Đặt lại mật khẩu bằng mã email. Có mã email = chứng minh quyền kiểm soát hộp thư nên đồng thời đánh dấu
 * email đã xác minh, mở khóa tài khoản và thu hồi MỌI phiên. 2FA (nếu bật) vẫn giữ nguyên.
 */
export async function resetPassword(input: ResetPasswordInput, ctx: ClientContext): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
  });
  if (!user) throw ApiError.of('INVALID_CODE', 'Invalid verification code');

  await verifyCode(user.id, 'RESET_PASSWORD', input.code);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: { id: true },
  });
  await revokeUserSessions(user.id, { reason: 'PASSWORD_RESET' });
  await recordAuthEvent({ userId: user.id, type: 'PASSWORD_RESET', ctx });
  queueMail({
    to: user.email,
    ...passwordChangedMail(ctx.lang, { fullName: user.fullName }),
  });
}

/** Đổi mật khẩu khi đang đăng nhập: cần mật khẩu cũ; các thiết bị khác bị đăng xuất. */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: { currentPassword: string; newPassword: string },
  ctx: ClientContext,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  assertNotLocked(stateOf(user));

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    await registerFailedAttempt(user.id, 'LOGIN_FAILED', ctx, 'invalid_current_password');
    throw ApiError.of('INVALID_PASSWORD', 'Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
    select: { id: true },
  });
  await resetFailures(user);
  await revokeUserSessions(user.id, {
    exceptSessionId: currentSessionId,
    reason: 'PASSWORD_CHANGED',
  });
  await recordAuthEvent({
    userId: user.id,
    type: 'PASSWORD_CHANGED',
    sessionId: currentSessionId,
    ctx,
  });
  queueMail({ to: user.email, ...passwordChangedMail(ctx.lang, { fullName: user.fullName }) });
}
