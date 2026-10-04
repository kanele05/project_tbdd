/**
 * Giả lập Cloudflare Turnstile `siteverify` bằng cách mock `fetch` toàn cục (test không gọi mạng):
 *   token `VALID_CAPTCHA` -> success; token khác -> success:false.
 * Gọi `mockTurnstile()` trong beforeEach và `restoreTurnstile()` trong afterEach.
 */
import { TURNSTILE_VERIFY_URL } from '@/lib/turnstile';

export const VALID_CAPTCHA = 'valid-captcha-token';

type FetchMock = jest.SpiedFunction<typeof fetch>;

let spy: FetchMock | undefined;

export function mockTurnstile(): FetchMock {
  spy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== TURNSTILE_VERIFY_URL) throw new Error(`Unexpected network call to ${url}`);
    const body = init?.body as URLSearchParams;
    const success = body.get('response') === VALID_CAPTCHA;
    return new Response(JSON.stringify({ success }), {
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
