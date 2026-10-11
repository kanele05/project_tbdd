/**
 * Đăng ký / đăng nhập (AUTH-02, AUTH-04, AUTH-05, AUTH-06).
 *
 * Luồng đăng ký:  POST /auth/register (CAPTCHA) -> email OTP -> POST /auth/verify-email -> cấp token luôn.
 *   (Quyết định: đăng ký KHÔNG cấp token; token chỉ được cấp sau khi xác minh email thành công.)
 * Luồng đăng nhập: POST /auth/login -> (CAPTCHA sau 3 lần sai) -> [2FA: POST /auth/2fa/verify] -> token.
 */
import { ApiError } from '@/lib/ApiError';
import { assertCaptcha } from '@/lib/captcha';
import { maskIp } from '@/lib/device';
import { CHALLENGE_TOKEN_TTL_SEC, signChallengeToken, verifyChallengeToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { queueMail } from '@/lib/mailer';
import { newDeviceMail, verifyEmailMail } from '@/lib/mailTemplates';
import { toUserDto, userDtoSelect } from '@/lib/mappers';
import { notificationMessage } from '@/lib/notificationMessage';
import { notify } from '@/lib/notify';
import { hashPassword, verifyPassword } from '@/lib/password';
import { Prisma, prisma } from '@/lib/prisma';
import type { ClientContext } from '@/types/auth';
import type {
  AuthSessionDto,
  LoginResultDto,
  RegisterResultDto,
  SentCodeDto,
  UserDto,
} from '@/types/dto';

import type {
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  TwoFactorLoginInput,
  VerifyEmailInput,
} from './auth.schema';
import { recordAuthEvent } from './authEvent.service';
import {
  assertNotLocked,
  getUnknownEmailState,
  lockedError,
  needsCaptcha,
  recordUnknownEmailFailure,
  registerFailedAttempt,
  resetFailures,
  stateOf,
} from './lockout.service';
import {
  getResendWaitSec,
  hasPendingCode,
  issueCode,
  OTP_RESEND_COOLDOWN_SEC,
  OTP_TTL_SEC,
  verifyCode,
} from './otp.service';
import { type StartedSession, startSession } from './session.service';
import { verifySecondFactor } from './twoFactor.service';

// Khi email không tồn tại vẫn so sánh với hash giả để thời gian phản hồi không lộ email nào đã đăng ký.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password-1');
  return dummyHash;
}

const loginUserSelect = {
  ...userDtoSelect,
  passwordHash: true,
  emailVerifiedAt: true,
  failedLoginCount: true,
  lockedUntil: true,
  totpEnabledAt: true,
  totpSecretEnc: true,
  totpLastStep: true,
  disabledAt: true,
} as const;

type LoginUser = NonNullable<Awaited<ReturnType<typeof findLoginUser>>>;

function findLoginUser(where: { email: string } | { id: string }) {
  return prisma.user.findUnique({ where, select: loginUserSelect });
}

/** BR-28: tài khoản bị admin khóa không đăng nhập được (kiểm tra SAU khi mật khẩu đúng, không lộ cho người lạ). */
function assertNotDisabled(user: { disabledAt: Date | null }): void {
  if (user.disabledAt) throw ApiError.of('ACCOUNT_DISABLED', 'This account has been disabled');
}

function sentCode(): SentCodeDto {
  return { sent: true, codeExpiresIn: OTP_TTL_SEC, resendAfter: OTP_RESEND_COOLDOWN_SEC };
}

/** Tạo OTP xác minh email và gửi thư nền (không chờ SMTP). */
async function sendVerificationCode(
  user: { id: string; email: string; fullName: string },
  ctx: ClientContext,
): Promise<void> {
  const { code } = await issueCode(user.id, 'VERIFY_EMAIL');
  queueMail({
    to: user.email,
    ...verifyEmailMail(ctx.lang, {
      fullName: user.fullName,
      code,
      ttlMinutes: OTP_TTL_SEC / 60,
    }),
  });
}

// ---------------------------------------------------------------- đăng ký + xác minh email

export async function register(
  input: RegisterInput,
  ctx: ClientContext,
): Promise<RegisterResultDto> {
  await assertCaptcha(input.captchaToken, ctx.ip);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw ApiError.conflict('EMAIL_TAKEN', 'Email already in use');

  const passwordHash = await hashPassword(input.password);
  let user: UserDto;
  try {
    const created = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        role: input.role,
        ...(input.role === 'TEACHER'
          ? { teacherProfile: { create: { jobTitle: '', bio: '' } } }
          : {}),
      },
      select: userDtoSelect,
    });
    user = toUserDto(created);
  } catch (err) {
    // Hai request đăng ký cùng email chạy song song: DB chặn bằng unique index.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('EMAIL_TAKEN', 'Email already in use');
    }
    throw err;
  }

  await recordAuthEvent({ userId: user.id, type: 'REGISTER', ctx });
  await sendVerificationCode(user, ctx);
  return {
    user,
    emailVerificationRequired: true,
    codeExpiresIn: OTP_TTL_SEC,
    resendAfter: OTP_RESEND_COOLDOWN_SEC,
  };
}

/** Xác minh OTP -> đánh dấu email đã xác minh và cấp token luôn (không bắt đăng nhập lại). */
export async function verifyEmail(
  input: VerifyEmailInput,
  ctx: ClientContext,
): Promise<AuthSessionDto> {
  const user = await findLoginUser({ email: input.email });
  if (!user) throw ApiError.of('INVALID_CODE', 'Invalid verification code');
  if (user.emailVerifiedAt) throw ApiError.of('ALREADY_VERIFIED', 'Email is already verified');

  await verifyCode(user.id, 'VERIFY_EMAIL', input.code);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
    select: { id: true },
  });
  await recordAuthEvent({ userId: user.id, type: 'EMAIL_VERIFIED', ctx });
  return completeLogin(user, ctx, input.deviceName, 'email_verification');
}

/**
 * Gửi lại mã xác minh. Email không tồn tại / đã xác minh -> vẫn trả 200 như thường (không lộ gì);
 * gửi lại trước 60 giây -> 429 `RESEND_TOO_SOON` (`details.retryAfterSec`).
 */
export async function resendVerification(
  input: ResendVerificationInput,
  ctx: ClientContext,
): Promise<SentCodeDto> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return sentCode();

  const wait = await getResendWaitSec(user.id, 'VERIFY_EMAIL');
  if (wait > 0) {
    throw ApiError.of('RESEND_TOO_SOON', 'Please wait before requesting another code', {
      retryAfterSec: wait,
    });
  }
  await sendVerificationCode(user, ctx);
  return sentCode();
}

// ---------------------------------------------------------------- đăng nhập

/** Đăng nhập chưa xác minh email: gửi mã mới nếu chưa có mã còn hạn, rồi trả 403 để app mở màn nhập OTP. */
async function rejectUnverified(user: LoginUser, ctx: ClientContext): Promise<never> {
  if (!(await hasPendingCode(user.id, 'VERIFY_EMAIL'))) await sendVerificationCode(user, ctx);
  const resendAfter = await getResendWaitSec(user.id, 'VERIFY_EMAIL');
  throw ApiError.of('EMAIL_NOT_VERIFIED', 'Verify your email to continue', {
    email: user.email,
    resendAfter,
  });
}

/** Sai mật khẩu / email không tồn tại: cùng một thông báo; từ lần sai thứ 3 báo client cần CAPTCHA. */
async function rejectBadCredentials(
  found: LoginUser | null,
  email: string,
  ctx: ClientContext,
): Promise<never> {
  let failedCount: number;
  if (found) {
    failedCount = (await registerFailedAttempt(found.id, 'LOGIN_FAILED', ctx, 'invalid_password'))
      .failedCount;
  } else {
    const result = recordUnknownEmailFailure(email);
    if (result.justLocked && result.lockedUntil) throw lockedError(result.lockedUntil);
    failedCount = result.failedCount;
  }
  throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password', {
    captchaRequired: needsCaptcha({ failedCount }),
  });
}

export async function login(input: LoginInput, ctx: ClientContext): Promise<LoginResultDto> {
  const found = await findLoginUser({ email: input.email });
  const state = found ? stateOf(found) : getUnknownEmailState(input.email);
  assertNotLocked(state);
  if (needsCaptcha(state)) await assertCaptcha(input.captchaToken, ctx.ip);

  const matches = await verifyPassword(
    input.password,
    found?.passwordHash ?? (await getDummyHash()),
  );
  if (!found || !matches) return rejectBadCredentials(found, input.email, ctx);
  assertNotDisabled(found);

  if (!found.emailVerifiedAt) {
    await resetFailures(found);
    return rejectUnverified(found, ctx);
  }
  if (found.totpEnabledAt) {
    // Chưa reset bộ đếm: nếu reset ở đây, kẻ biết mật khẩu có thể dò mã 2FA không giới hạn bằng cách đăng nhập lại.
    return {
      twoFactorRequired: true,
      challengeToken: signChallengeToken(found.id),
      challengeExpiresIn: CHALLENGE_TOKEN_TTL_SEC,
    };
  }
  await resetFailures(found);
  return completeLogin(found, ctx, input.deviceName, 'password');
}

/** Bước 2 của đăng nhập có 2FA: `challengeToken` + mã TOTP hoặc mã khôi phục. */
export async function verifyTwoFactorLogin(
  input: TwoFactorLoginInput,
  ctx: ClientContext,
): Promise<AuthSessionDto> {
  const userId = verifyChallengeToken(input.challengeToken);
  const user = userId ? await findLoginUser({ id: userId }) : null;
  if (!user?.totpEnabledAt) {
    throw ApiError.of('INVALID_CHALLENGE', 'Two-factor session expired, sign in again');
  }
  assertNotDisabled(user);
  assertNotLocked(stateOf(user));

  const method = await verifySecondFactor(user, input);
  if (!method) {
    const failure = await registerFailedAttempt(user.id, 'TWO_FACTOR_FAILED', ctx, 'invalid_code');
    throw ApiError.of('INVALID_CODE', 'Invalid verification code', {
      attemptsLeft: Math.max(0, 5 - failure.failedCount),
    });
  }
  if (method === 'recovery') {
    await recordAuthEvent({ userId: user.id, type: 'RECOVERY_CODE_USED', ctx });
  }
  await resetFailures(user);
  return completeLogin(
    user,
    ctx,
    input.deviceName,
    method === 'recovery' ? 'recovery_code' : 'totp',
  );
}

/** Tạo phiên + token, ghi nhật ký, cảnh báo nếu là thiết bị mới. */
async function completeLogin(
  user: LoginUser,
  ctx: ClientContext,
  clientDeviceName: string | undefined,
  method: 'password' | 'totp' | 'recovery_code' | 'email_verification',
): Promise<AuthSessionDto> {
  assertNotDisabled(user);
  const started = await startSession(user, ctx, clientDeviceName);
  await recordAuthEvent({
    userId: user.id,
    type: 'LOGIN_SUCCESS',
    sessionId: started.sessionId,
    ctx,
    metadata: { method },
  });
  if (started.isNewDevice) await alertNewDevice(user, started, ctx);
  return { twoFactorRequired: false, ...started.tokens, user: toUserDto(user) };
}

/** AUTH-06: thông báo trong app + email khi đăng nhập từ thiết bị chưa từng dùng. */
async function alertNewDevice(
  user: LoginUser,
  started: StartedSession,
  ctx: ClientContext,
): Promise<void> {
  await recordAuthEvent({
    userId: user.id,
    type: 'NEW_DEVICE_LOGIN',
    sessionId: started.sessionId,
    ctx,
    metadata: { deviceName: started.deviceName },
  });
  try {
    await notify(prisma, {
      userId: user.id,
      message: notificationMessage('NEW_DEVICE', { device: started.deviceName }, ctx.lang),
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to create new-device notification');
  }
  queueMail({
    to: user.email,
    ...newDeviceMail(ctx.lang, {
      fullName: user.fullName,
      deviceName: started.deviceName,
      ip: maskIp(ctx.ip),
      when: new Date(),
    }),
  });
}

export async function getMe(userId: string): Promise<UserDto> {
  const found = await prisma.user.findUnique({ where: { id: userId }, select: userDtoSelect });
  // Token còn hạn nhưng tài khoản đã bị xóa -> coi như chưa đăng nhập.
  if (!found) throw ApiError.unauthorized('Account no longer exists');
  return toUserDto(found);
}
