/**
 * Mã OTP 6 số gửi qua email (AUTH-02 xác minh email, AUTH-03 quên mật khẩu).
 * Hết hạn 10 phút · tối đa 5 lần nhập · gửi lại sau 60 giây · DB chỉ lưu HMAC của mã.
 */
import type { OneTimeCodePurpose } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { generateOtp, hashOtp, safeEqual } from '@/lib/authCrypto';
import { prisma } from '@/lib/prisma';

export const OTP_TTL_SEC = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SEC = 60;

/**
 * Tạo mã mới và HỦY mọi mã cũ cùng mục đích của user (luôn chỉ có một mã còn hiệu lực).
 * Trả mã thô để gửi email - sau đó không còn cách nào lấy lại.
 */
export async function issueCode(
  userId: string,
  purpose: OneTimeCodePurpose,
  now = new Date(),
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SEC * 1000);
  await prisma.$transaction([
    prisma.oneTimeCode.deleteMany({ where: { userId, purpose } }),
    prisma.oneTimeCode.create({
      data: { userId, purpose, codeHash: hashOtp(userId, purpose, code), expiresAt },
      select: { id: true },
    }),
  ]);
  return { code, expiresAt };
}

/** Số giây còn phải chờ trước khi được gửi mã mới (0 = gửi được ngay). */
export async function getResendWaitSec(
  userId: string,
  purpose: OneTimeCodePurpose,
  now = new Date(),
): Promise<number> {
  const latest = await prisma.oneTimeCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!latest) return 0;
  const readyAt = latest.createdAt.getTime() + OTP_RESEND_COOLDOWN_SEC * 1000;
  return Math.max(0, Math.ceil((readyAt - now.getTime()) / 1000));
}

/** Có mã chưa dùng và chưa hết hạn hay không (đăng nhập tài khoản chưa xác minh chỉ gửi mã mới khi chưa có). */
export async function hasPendingCode(
  userId: string,
  purpose: OneTimeCodePurpose,
  now = new Date(),
): Promise<boolean> {
  const count = await prisma.oneTimeCode.count({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: now } },
  });
  return count > 0;
}

/**
 * Kiểm tra mã; thành công thì đánh dấu đã dùng. Thất bại ném:
 *  - 400 `INVALID_CODE` (kèm `details.attemptsLeft`) - sai mã / không có mã nào đang chờ;
 *  - 400 `CODE_EXPIRED` - mã đã hết hạn;
 *  - 429 `TOO_MANY_ATTEMPTS` - đã nhập sai 5 lần, mã bị vô hiệu, phải xin mã mới.
 * Tăng bộ đếm TRƯỚC khi so sánh để nhiều request song song cũng không vượt quá 5 lần thử.
 */
export async function verifyCode(
  userId: string,
  purpose: OneTimeCodePurpose,
  code: string,
  now = new Date(),
): Promise<void> {
  const latest = await prisma.oneTimeCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) throw ApiError.of('INVALID_CODE', 'Invalid verification code');
  if (latest.expiresAt.getTime() <= now.getTime()) {
    throw ApiError.of('CODE_EXPIRED', 'The verification code has expired. Request a new one.');
  }
  if (latest.attempts >= OTP_MAX_ATTEMPTS) throw tooManyAttempts();

  const { attempts } = await prisma.oneTimeCode.update({
    where: { id: latest.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });
  if (attempts > OTP_MAX_ATTEMPTS) throw tooManyAttempts();

  if (!safeEqual(latest.codeHash, hashOtp(userId, purpose, code))) {
    if (attempts >= OTP_MAX_ATTEMPTS) throw tooManyAttempts();
    throw ApiError.of('INVALID_CODE', 'Invalid verification code', {
      attemptsLeft: OTP_MAX_ATTEMPTS - attempts,
    });
  }

  const consumed = await prisma.oneTimeCode.updateMany({
    where: { id: latest.id, consumedAt: null },
    data: { consumedAt: now },
  });
  // Hai request cùng lúc với đúng mã: chỉ một request thắng.
  if (consumed.count === 0) throw ApiError.of('INVALID_CODE', 'Invalid verification code');
}

function tooManyAttempts(): ApiError {
  return ApiError.of(
    'TOO_MANY_ATTEMPTS',
    'Too many incorrect attempts. Request a new verification code.',
  );
}
