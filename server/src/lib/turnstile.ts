/**
 * CAPTCHA Cloudflare Turnstile (AUTH-05): xác minh token phía server qua `siteverify`.
 *  - Lỗi mạng / timeout / Cloudflare trả lỗi -> TỪ CHỐI an toàn (`CAPTCHA_UNAVAILABLE`, 503), không bao giờ cho qua.
 *  - Chưa cấu hình `TURNSTILE_SECRET_KEY`: dev/test bỏ qua CAPTCHA (chạy local không cần tài khoản Cloudflare);
 *    production -> từ chối (`CAPTCHA_UNAVAILABLE`) để không vô tình mở cửa cho bot.
 */
import { env, isProduction } from '@/config/env';
import { ApiError } from '@/lib/ApiError';
import { logger } from '@/lib/logger';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

type VerifyOutcome = 'ok' | 'rejected' | 'unavailable';

async function callSiteverify(
  secret: string,
  token: string,
  ip: string | null,
): Promise<VerifyOutcome> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'Turnstile siteverify returned an error status');
      return 'unavailable';
    }
    const result = (await response.json()) as { success?: unknown };
    return result.success === true ? 'ok' : 'rejected';
  } catch (err) {
    logger.warn({ err }, 'Turnstile siteverify request failed');
    return 'unavailable';
  }
}

/**
 * Bắt buộc CAPTCHA hợp lệ. Lỗi mang `details.captchaRequired: true` để client biết phải hiện widget.
 * - thiếu token -> 400 `CAPTCHA_REQUIRED`; token sai/hết hạn/đã dùng -> 400 `CAPTCHA_FAILED`;
 * - không xác minh được (mạng, chưa cấu hình ở production) -> 503 `CAPTCHA_UNAVAILABLE`.
 */
export async function assertCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (isProduction) {
      logger.error(
        'TURNSTILE_SECRET_KEY is not configured; CAPTCHA-protected endpoints are refusing requests',
      );
      throw ApiError.of(
        'CAPTCHA_UNAVAILABLE',
        'CAPTCHA verification is unavailable, try again later',
      );
    }
    return;
  }
  if (!token) {
    throw ApiError.of('CAPTCHA_REQUIRED', 'Complete the CAPTCHA to continue', {
      captchaRequired: true,
    });
  }
  const outcome = await callSiteverify(secret, token, ip);
  if (outcome === 'rejected') {
    throw ApiError.of('CAPTCHA_FAILED', 'CAPTCHA verification failed, please try again', {
      captchaRequired: true,
    });
  }
  if (outcome === 'unavailable') {
    throw ApiError.of(
      'CAPTCHA_UNAVAILABLE',
      'CAPTCHA verification is unavailable, try again later',
    );
  }
}
