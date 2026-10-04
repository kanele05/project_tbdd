import type { env as appEnv } from '@/config/env';

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');
const DEV_KEY = Buffer.alloc(32).toString('base64');

const BASE_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/elearning_test_env?schema=public',
  JWT_SECRET: 'x'.repeat(32),
  // Chuỗi rỗng = "chưa đặt" và dotenv không ghi đè -> kết quả không phụ thuộc file .env cục bộ của từng máy.
  ACCESS_TOKEN_TTL: '',
  REFRESH_TOKEN_TTL: '',
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  MAIL_FROM: '',
  TURNSTILE_SITE_KEY: '',
  TURNSTILE_SECRET_KEY: '',
  TOTP_ENC_KEY: '',
};

type LoadedEnv = typeof appEnv;

/** Nạp `@/config/env` mới tinh với các biến môi trường cho trước, rồi khôi phục `process.env`. */
function loadEnv(overrides: Record<string, string> = {}): LoadedEnv {
  const snapshot = { ...process.env };
  Object.assign(process.env, BASE_ENV, overrides);
  try {
    let loaded: LoadedEnv | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = (require('@/config/env') as { env: LoadedEnv }).env;
    });
    return loaded as LoadedEnv;
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

describe('env: token lifetimes', () => {
  it('defaults to a 15 minute access token and a 30 day refresh token', () => {
    const env = loadEnv();
    expect(env.ACCESS_TOKEN_TTL).toBe('15m');
    expect(env.REFRESH_TOKEN_TTL).toBe('30d');
  });

  it('accepts seconds, minutes, hours and days', () => {
    const env = loadEnv({ ACCESS_TOKEN_TTL: '900s', REFRESH_TOKEN_TTL: '12h' });
    expect(env.ACCESS_TOKEN_TTL).toBe('900s');
    expect(env.REFRESH_TOKEN_TTL).toBe('12h');
  });

  it.each(['15 minutes', '0m', '-5m', 'abc', '10'])('rejects the invalid duration "%s"', (ttl) => {
    expect(() => loadEnv({ ACCESS_TOKEN_TTL: ttl })).toThrow(/ACCESS_TOKEN_TTL/);
  });
});

describe('env: SMTP', () => {
  it('has no SMTP host by default and falls back to port 587 and a default sender', () => {
    const env = loadEnv();
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
    expect(env.MAIL_FROM).toContain('no-reply@');
  });

  it('reads the SMTP settings', () => {
    const env = loadEnv({
      SMTP_HOST: 'smtp-relay.example.com',
      SMTP_PORT: '2525',
      SMTP_USER: 'user',
      SMTP_PASS: 'secret',
      MAIL_FROM: 'E-Learning <no-reply@example.com>',
    });
    expect(env).toMatchObject({
      SMTP_HOST: 'smtp-relay.example.com',
      SMTP_PORT: 2525,
      SMTP_USER: 'user',
      SMTP_PASS: 'secret',
      MAIL_FROM: 'E-Learning <no-reply@example.com>',
    });
  });

  it('rejects a port outside 1-65535', () => {
    expect(() => loadEnv({ SMTP_PORT: '70000' })).toThrow(/SMTP_PORT/);
  });
});

describe('env: Turnstile and TOTP', () => {
  it('treats empty Turnstile keys as not configured', () => {
    const env = loadEnv();
    expect(env.TURNSTILE_SITE_KEY).toBeUndefined();
    expect(env.TURNSTILE_SECRET_KEY).toBeUndefined();
  });

  it('accepts a 32 byte base64 TOTP key', () => {
    expect(loadEnv({ TOTP_ENC_KEY: VALID_KEY }).TOTP_ENC_KEY).toBe(VALID_KEY);
  });

  it('rejects a TOTP key that is not 32 bytes', () => {
    const shortKey = Buffer.alloc(16, 1).toString('base64');
    expect(() => loadEnv({ TOTP_ENC_KEY: shortKey })).toThrow(/TOTP_ENC_KEY must be 32 bytes/);
  });

  it('does not require a TOTP key outside production', () => {
    expect(loadEnv().TOTP_ENC_KEY).toBeUndefined();
  });
});

describe('env: production guard', () => {
  it('requires TOTP_ENC_KEY', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/TOTP_ENC_KEY is required/);
  });

  it('refuses the dev key from .env.example', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', TOTP_ENC_KEY: DEV_KEY })).toThrow(
      /must not be the dev key/,
    );
  });

  it('starts with a real key', () => {
    expect(loadEnv({ NODE_ENV: 'production', TOTP_ENC_KEY: VALID_KEY }).NODE_ENV).toBe(
      'production',
    );
  });
});
