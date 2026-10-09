import type * as CaptchaNamespace from './captcha';

const mockLogger = { warn: jest.fn(), error: jest.fn() };
jest.mock('@/lib/logger', () => ({ logger: mockLogger }));

type Captcha = typeof CaptchaNamespace;

type CaptchaEnv = {
  provider?: 'turnstile' | 'recaptcha_v2';
  siteKey?: string;
  secret?: string;
  allowedHostnames?: string;
  isProduction?: boolean;
};

function loadCaptcha(envValues: CaptchaEnv): Captcha {
  let loaded: Captcha | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/config/env', () => ({
      isProduction: envValues.isProduction ?? false,
      env: {
        CAPTCHA_PROVIDER: envValues.provider,
        RECAPTCHA_SITE_KEY: envValues.siteKey,
        RECAPTCHA_SECRET_KEY: envValues.secret,
        CAPTCHA_ALLOWED_HOSTNAMES: envValues.allowedHostnames,
        TURNSTILE_SECRET_KEY: envValues.secret,
      },
    }));
    loaded = jest.requireActual<Captcha>('./captcha');
  });
  jest.dontMock('@/config/env');
  return loaded as Captcha;
}

const SECRET = 'recaptcha-secret';
const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const HOSTNAMES = 'Example.com, api.example.com';
let fetchSpy: jest.SpiedFunction<typeof fetch>;

function respond(body: unknown, status = 200): void {
  fetchSpy.mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );
}

function validResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    hostname: 'EXAMPLE.COM.',
    challenge_ts: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-08T10:00:00.000Z') });
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

describe('assertCaptcha with reCAPTCHA v2', () => {
  it('posts secret, response and IP to Google and accepts an exact normalized hostname', async () => {
    respond(validResponse());
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    await expect(assertCaptcha('good-token', '1.2.3.4')).resolves.toBeUndefined();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe(SECRET);
    expect(body.get('response')).toBe('good-token');
    expect(body.get('remoteip')).toBe('1.2.3.4');
  });

  it('omits remoteip when the IP is unavailable', async () => {
    respond(validResponse());
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    await assertCaptcha('good-token', null);
    const body = (fetchSpy.mock.calls[0]?.[1] as RequestInit).body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
  });

  it('requires a token before making a verification request', async () => {
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    await expect(assertCaptcha(undefined, null)).rejects.toMatchObject({
      status: 400,
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects failed verification and hostnames that only share a suffix', async () => {
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: 'example.com',
    });
    respond({ success: false });
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    respond(validResponse({ hostname: 'evil-example.com' }));
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    respond(validResponse({ hostname: 'sub.example.com' }));
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
  });

  it.each([
    ['missing hostname', { hostname: undefined }],
    ['missing challenge timestamp', { challenge_ts: undefined }],
    ['malformed challenge timestamp', { challenge_ts: 'not-a-timestamp' }],
  ])('rejects %s', async (_label, overrides) => {
    respond(validResponse(overrides));
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
  });

  it('rejects timestamps older than 120 seconds and timestamps beyond future clock skew', async () => {
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    respond(validResponse({ challenge_ts: '2026-10-08T09:57:59.999Z' }));
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    respond(validResponse({ challenge_ts: '2026-10-08T10:01:00.001Z' }));
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    respond(validResponse({ challenge_ts: '2026-10-08T10:00:59.999Z' }));
    await expect(assertCaptcha('token', null)).resolves.toBeUndefined();
  });

  it.each(['score', 'action'] as const)('rejects a v3-style %s field', async (field) => {
    respond(validResponse({ [field]: field === 'score' ? 0.9 : 'login' }));
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
  });

  it('fails closed for malformed responses, HTTP errors and network errors without logging secrets or tokens', async () => {
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      secret: SECRET,
      allowedHostnames: HOSTNAMES,
    });
    respond('{bad json');
    await expect(assertCaptcha('sensitive-token', null)).rejects.toMatchObject({
      code: 'CAPTCHA_UNAVAILABLE',
    });
    respond({ success: 'true' });
    await expect(assertCaptcha('sensitive-token', null)).rejects.toMatchObject({
      code: 'CAPTCHA_UNAVAILABLE',
    });
    respond('unavailable', 502);
    await expect(assertCaptcha('sensitive-token', null)).rejects.toMatchObject({
      code: 'CAPTCHA_UNAVAILABLE',
    });
    fetchSpy.mockRejectedValue(new Error(`request failed with ${SECRET} sensitive-token`));
    await expect(assertCaptcha('sensitive-token', null)).rejects.toMatchObject({
      code: 'CAPTCHA_UNAVAILABLE',
    });
    const logs = JSON.stringify([...mockLogger.warn.mock.calls, ...mockLogger.error.mock.calls]);
    expect(logs).not.toContain(SECRET);
    expect(logs).not.toContain('sensitive-token');
  });

  it('fails closed when configured without an allowed hostname', async () => {
    const { assertCaptcha } = loadCaptcha({ provider: 'recaptcha_v2', secret: SECRET });
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({
      status: 503,
      code: 'CAPTCHA_UNAVAILABLE',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('can verify with Google documented test keys outside production', async () => {
    respond(validResponse({ hostname: 'testkey.google.com' }));
    const { assertCaptcha } = loadCaptcha({
      provider: 'recaptcha_v2',
      siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
      secret: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
      allowedHostnames: 'localhost',
    });
    await expect(assertCaptcha('test-token', null)).resolves.toBeUndefined();
  });
});

describe('assertCaptcha without a configured secret', () => {
  it('keeps the development skip behavior', async () => {
    const { assertCaptcha } = loadCaptcha({ provider: 'recaptcha_v2' });
    await expect(assertCaptcha(undefined, null)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed in production', async () => {
    const { assertCaptcha } = loadCaptcha({ provider: 'recaptcha_v2', isProduction: true });
    await expect(assertCaptcha('token', null)).rejects.toMatchObject({
      status: 503,
      code: 'CAPTCHA_UNAVAILABLE',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
