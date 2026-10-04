/**
 * Chống brute force (AUTH-05, AUTH-06): đếm lần sai LIÊN TIẾP (mật khẩu hoặc mã 2FA),
 *  - từ lần sai thứ 3 trở đi đăng nhập phải kèm CAPTCHA;
 *  - sai lần thứ 5 -> khóa tài khoản 15 phút (`423 ACCOUNT_LOCKED`, `details.retryAfterSec`).
 * Email KHÔNG tồn tại cũng được đếm/khóa y như email thật (bộ đếm trong bộ nhớ) để phản hồi không
 * lộ email nào đã đăng ký.
 */
import { ApiError } from '@/lib/ApiError';
import { TtlCache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';
import type { ClientContext } from '@/types/auth';

import { recordAuthEvent } from './authEvent.service';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_SEC = 15 * 60;
export const CAPTCHA_AFTER_FAILURES = 3;

export type FailureState = { failedCount: number; lockedUntil: Date | null };
export type FailureResult = FailureState & { justLocked: boolean };

/** Bộ đếm cho email không tồn tại; tự hết hạn sau thời gian khóa. Luôn bật (kể cả khi test). */
const unknownEmailFailures = new TtlCache({ max: 10_000, defaultTtlMs: LOCK_DURATION_SEC * 1000 });

export function stateOf(user: {
  failedLoginCount: number;
  lockedUntil: Date | null;
}): FailureState {
  return { failedCount: user.failedLoginCount, lockedUntil: user.lockedUntil };
}

export function retryAfterSec(lockedUntil: Date, now = new Date()): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}

export function lockedError(lockedUntil: Date, now = new Date()): ApiError {
  return ApiError.of('ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.', {
    retryAfterSec: retryAfterSec(lockedUntil, now),
  });
}

/** Đang bị khóa -> ném 423 (kiểm tra TRƯỚC khi đụng tới mật khẩu để không lộ mật khẩu đúng hay sai). */
export function assertNotLocked(state: FailureState, now = new Date()): void {
  if (state.lockedUntil && state.lockedUntil.getTime() > now.getTime()) {
    throw lockedError(state.lockedUntil, now);
  }
}

export function needsCaptcha(state: Pick<FailureState, 'failedCount'>): boolean {
  return state.failedCount >= CAPTCHA_AFTER_FAILURES;
}

/** Ghi nhận một lần sai của tài khoản có thật; đủ 5 lần thì khóa và đặt lại bộ đếm. */
export async function recordFailure(userId: string, now = new Date()): Promise<FailureResult> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (updated.failedLoginCount < MAX_FAILED_ATTEMPTS) {
    return { failedCount: updated.failedLoginCount, lockedUntil: null, justLocked: false };
  }
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_SEC * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil },
    select: { id: true },
  });
  return { failedCount: 0, lockedUntil, justLocked: true };
}

/**
 * Ghi nhận + ghi nhật ký một lần xác thực sai (mật khẩu hoặc mã 2FA) của tài khoản có thật.
 * Nếu lần này khiến tài khoản bị khóa thì ném `423 ACCOUNT_LOCKED`; ngược lại trả kết quả để caller tự ném lỗi riêng.
 */
export async function registerFailedAttempt(
  userId: string,
  type: 'LOGIN_FAILED' | 'TWO_FACTOR_FAILED',
  ctx: ClientContext,
  reason: string,
): Promise<FailureResult> {
  const result = await recordFailure(userId);
  await recordAuthEvent({
    userId,
    type: result.justLocked ? 'LOGIN_LOCKED' : type,
    ctx,
    metadata: { reason },
  });
  if (result.justLocked && result.lockedUntil) throw lockedError(result.lockedUntil);
  return result;
}

/** Về 0 sau khi xác thực thành công hoàn toàn; bỏ qua truy vấn nếu không có gì để xóa. */
export async function resetFailures(user: {
  id: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
}): Promise<void> {
  if (user.failedLoginCount === 0 && user.lockedUntil === null) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
    select: { id: true },
  });
}

// ---------------------------------------------------------------- email không tồn tại

const unknownKey = (email: string): string => `login-failures:${email}`;

export function getUnknownEmailState(email: string): FailureState {
  return (
    unknownEmailFailures.get<FailureState>(unknownKey(email)) ?? {
      failedCount: 0,
      lockedUntil: null,
    }
  );
}

export function recordUnknownEmailFailure(email: string, now = new Date()): FailureResult {
  const count = getUnknownEmailState(email).failedCount + 1;
  if (count < MAX_FAILED_ATTEMPTS) {
    unknownEmailFailures.set(unknownKey(email), { failedCount: count, lockedUntil: null });
    return { failedCount: count, lockedUntil: null, justLocked: false };
  }
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_SEC * 1000);
  unknownEmailFailures.set(unknownKey(email), { failedCount: 0, lockedUntil });
  return { failedCount: 0, lockedUntil, justLocked: true };
}
