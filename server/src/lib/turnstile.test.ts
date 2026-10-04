import type * as TurnstileNamespace from './turnstile';

const mockLogger = { warn: jest.fn(), error: jest.fn() };
jest.mock('@/lib/logger', () => ({ logger: mockLogger }));

type Turnstile = typeof TurnstileNamespace;

function loadTurnstile(envValues: { secret?: string; isProduction?: boolean }): Turnstile {
  let loaded: Turnstile | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/config/env', () => ({
      isProduction: envValues.isProduction ?? false,
      env: { TURNSTILE_SECRET_KEY: envValues.secret },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('./turnstile') as Turnstile;
  });
  jest.dontMock('@/config/env');
  return loaded as Turnstile;
}

const SECRET = '1x0000000000000000000000000000000AA';
let fetchSpy: jest.SpiedFunction<typeof fetch>;

function respond(body: unknown, status = 200): void {
  fetchSpy.mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );
}

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
});
afterEach(() => fetchSpy.mockRestore());

describe('assertCaptcha with a secret key', () => {
  it('accepts a token that Cloudflare confirms and posts secret, response and IP as a form', async () => {
    respond({ success: true });
    const { assertCaptcha, TURNSTILE_VERIFY_URL } = loadTurnstile({ secret: SECRET });

    await expect(assertCaptcha('good-token', '1.2.3.4')).resolves.toBeUndefined();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe(SECRET);
    expect(body.get('response')).toBe('good-token');
    expect(body.get('remoteip')).toBe('1.2.3.4');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('omits remoteip when the IP is unknown', async () => {
    respond({ success: true });
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    await assertCaptcha('good-token', null);
    const body = (fetchSpy.mock.calls[0]?.[1] as RequestInit).body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
  });

  it('rejects a missing token with 400 CAPTCHA_REQUIRED without calling Cloudflare', async () => {
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    await expect(assertCaptcha(undefined, null)).rejects.toMatchObject({
      status: 400,
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });
    await expect(assertCaptcha('', null)).rejects.toMatchObject({ code: 'CAPTCHA_REQUIRED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a token Cloudflare refuses with 400 CAPTCHA_FAILED', async () => {
    respond({ success: false, 'error-codes': ['invalid-input-response'] });
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    await expect(assertCaptcha('bad', null)).rejects.toMatchObject({
      status: 400,
      code: 'CAPTCHA_FAILED',
      details: { captchaRequired: true },
    });
  });

  it('treats a truthy but non-true success value as a failure', async () => {
    respond({ success: 'true' });
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    await expect(assertCaptcha('x', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
  });

  it('fails safe (503 CAPTCHA_UNAVAILABLE) on a network error or timeout', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    await expect(assertCaptcha('x', null)).rejects.toMatchObject({
      status: 503,
      code: 'CAPTCHA_UNAVAILABLE',
    });
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('fails safe when Cloudflare answers with an HTTP error or invalid JSON', async () => {
    const { assertCaptcha } = loadTurnstile({ secret: SECRET });
    respond('Bad gateway', 502);
    await expect(assertCaptcha('x', null)).rejects.toMatchObject({ code: 'CAPTCHA_UNAVAILABLE' });
    respond('<html>not json</html>', 200);
    await expect(assertCaptcha('x', null)).rejects.toMatchObject({ code: 'CAPTCHA_UNAVAILABLE' });
  });
});

describe('assertCaptcha without a secret key', () => {
  it('skips verification outside production so local development works without a Cloudflare account', async () => {
    const { assertCaptcha } = loadTurnstile({});
    await expect(assertCaptcha(undefined, null)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses every request in production (fail closed)', async () => {
    const { assertCaptcha } = loadTurnstile({ isProduction: true });
    await expect(assertCaptcha('anything', null)).rejects.toMatchObject({
      status: 503,
      code: 'CAPTCHA_UNAVAILABLE',
    });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
