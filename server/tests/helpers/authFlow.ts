/**
 * Các bước đăng ký / đăng nhập / 2FA qua API thật, dùng chung cho test xác thực.
 * Yêu cầu: `installMailbox()` (đọc OTP từ thư) và `mockTurnstile()` (đã gọi trong beforeEach).
 */
import { base32Decode, totp } from '@/lib/totp';

import { VALID_CAPTCHA } from './captcha';
import { createUser, DEFAULT_TEST_PASSWORD, uniq } from './factories';
import { mailbox, otpFrom } from './mailbox';
import { API, type TestApi } from './testApp';

export type SessionBody = {
  twoFactorRequired: false;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  token: string;
  user: { id: string; email: string; fullName: string; role: string };
};

export const bearer = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

/** Đăng ký qua API (kèm CAPTCHA hợp lệ). Trả email/mật khẩu đã dùng. */
export async function registerViaApi(
  api: TestApi,
  overrides: { email?: string; password?: string; fullName?: string; lang?: string } = {},
) {
  const email = overrides.email ?? `${uniq('reg')}@example.com`;
  const password = overrides.password ?? 'Learn2026';
  const res = await api.post(`${API}/auth/register`).send({
    fullName: overrides.fullName ?? 'Martha Rosie',
    email,
    password,
    captchaToken: VALID_CAPTCHA,
    ...(overrides.lang ? { lang: overrides.lang } : {}),
  });
  return { email, password, res };
}

/** Đăng ký + đọc OTP từ thư + xác minh -> có phiên đăng nhập đầu tiên. */
export async function registerAndVerify(
  api: TestApi,
  overrides: { email?: string; password?: string; deviceName?: string } = {},
) {
  const { email, password, res } = await registerViaApi(api, overrides);
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const code = otpFrom(mailbox.lastTo(email));
  const verify = await api
    .post(`${API}/auth/verify-email`)
    .send({ email, code, ...(overrides.deviceName ? { deviceName: overrides.deviceName } : {}) });
  if (verify.status !== 200) {
    throw new Error(`verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  }
  return { email, password, session: verify.body.data as SessionBody };
}

/** Đăng nhập qua API (không kèm CAPTCHA trừ khi truyền `captchaToken`). */
export function loginViaApi(
  api: TestApi,
  email: string,
  password: string = DEFAULT_TEST_PASSWORD,
  extra: { deviceName?: string; captchaToken?: string } = {},
) {
  return api.post(`${API}/auth/login`).send({ email, password, ...extra });
}

/** Tạo user trong DB (đã xác minh) rồi đăng nhập thật qua API để có refresh token. */
export async function createUserAndLogin(
  api: TestApi,
  extra: { deviceName?: string; email?: string } = {},
) {
  const user = await createUser({ session: false, ...(extra.email ? { email: extra.email } : {}) });
  const res = await loginViaApi(api, user.email, user.password, {
    ...(extra.deviceName ? { deviceName: extra.deviceName } : {}),
  });
  if (res.status !== 200)
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { user, session: res.body.data as SessionBody };
}

/** Mã TOTP của một secret base32, lệch `stepOffset` bước 30 s so với hiện tại. */
export function totpCode(secretBase32: string, stepOffset = 0): string {
  return totp(base32Decode(secretBase32), Date.now() + stepOffset * 30_000);
}

/**
 * Bật 2FA cho phiên `accessToken`: setup -> enable bằng mã hiện tại.
 * Trả secret + 10 mã khôi phục. (Bước TOTP của lúc bật đã bị "dùng", mã đăng nhập kế tiếp phải thuộc bước sau: `totpCode(secret, 1)`.)
 */
export async function enableTwoFactorViaApi(api: TestApi, accessToken: string) {
  const setup = await api.post(`${API}/me/2fa/setup`).set(bearer(accessToken));
  if (setup.status !== 200) throw new Error(`setup failed: ${JSON.stringify(setup.body)}`);
  const secret = setup.body.data.secret as string;
  const enable = await api
    .post(`${API}/me/2fa/enable`)
    .set(bearer(accessToken))
    .send({ code: totpCode(secret) });
  if (enable.status !== 200) throw new Error(`enable failed: ${JSON.stringify(enable.body)}`);
  return { secret, recoveryCodes: enable.body.data.recoveryCodes as string[] };
}
