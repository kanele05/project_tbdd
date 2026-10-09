/**
 * Giả lập CAPTCHA `siteverify` bằng cách mock `fetch` toàn cục (test không gọi mạng).
 * Gọi `mockTurnstile()` trong beforeEach và `restoreTurnstile()` trong afterEach.
 */
import { env } from '@/config/env';
import { RECAPTCHA_VERIFY_URL, TURNSTILE_VERIFY_URL } from '@/lib/captcha';

export const VALID_CAPTCHA = 'valid-captcha-token';

type FetchMock = jest.SpiedFunction<typeof fetch>;

let spy: FetchMock | undefined;

export function mockTurnstile(): FetchMock {
  const recaptcha = env.CAPTCHA_PROVIDER === 'recaptcha_v2';
  const verifyUrl = recaptcha ? RECAPTCHA_VERIFY_URL : TURNSTILE_VERIFY_URL;
  const hostname =
    (env.CAPTCHA_ALLOWED_HOSTNAMES ?? 'localhost').split(',')[0]?.trim() || 'localhost';
  spy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== verifyUrl) throw new Error(`Unexpected network call to ${url}`);
    const body = init?.body as URLSearchParams;
    const success = body.get('response') === VALID_CAPTCHA;
    const result = recaptcha
      ? { success, hostname, challenge_ts: new Date().toISOString() }
      : { success };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return spy;
}

export function restoreTurnstile(): void {
  spy?.mockRestore();
  spy = undefined;
}
