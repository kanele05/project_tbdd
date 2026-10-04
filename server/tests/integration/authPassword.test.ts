import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

import { bearer, createUserAndLogin, loginViaApi, registerViaApi } from '../helpers/authFlow';
import { mockTurnstile, restoreTurnstile, VALID_CAPTCHA } from '../helpers/captcha';
import { createUser } from '../helpers/factories';
import { installMailbox, mailbox, otpFrom, uninstallMailbox } from '../helpers/mailbox';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeAll(() => installMailbox());
afterAll(() => uninstallMailbox());
beforeEach(async () => {
  await resetDb();
  mailbox.clear();
  mockTurnstile();
});
afterEach(() => restoreTurnstile());

const forgot = (body: Record<string, unknown>) =>
  api.post(`${API}/auth/forgot-password`).send(body);
const reset = (body: Record<string, unknown>) => api.post(`${API}/auth/reset-password`).send(body);

describe('POST /auth/forgot-password', () => {
  it('emails a 6-digit reset code to an existing account', async () => {
    const user = await createUser();
    const res = await forgot({ email: user.email, captchaToken: VALID_CAPTCHA });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ sent: true, codeExpiresIn: 600, resendAfter: 60 });
    const mail = mailbox.lastTo(user.email);
    expect(mail.subject).toBe('Reset your E-Learning password');
    expect(otpFrom(mail)).toMatch(/^\d{6}$/);
    const code = await prisma.oneTimeCode.findFirstOrThrow({ where: { userId: user.id } });
    expect(code.purpose).toBe('RESET_PASSWORD');
    expect(code.codeHash).not.toContain(otpFrom(mail));
    expect(
      await prisma.authEvent.count({
        where: { userId: user.id, type: 'PASSWORD_RESET_REQUESTED' },
      }),
    ).toBe(1);
  });

  it('answers exactly the same 200 for an unknown email and sends nothing (no account enumeration)', async () => {
    const user = await createUser();
    const known = await forgot({ email: user.email, captchaToken: VALID_CAPTCHA });
    mailbox.clear();
    const unknown = await forgot({ email: 'nobody@example.com', captchaToken: VALID_CAPTCHA });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(mailbox.messages).toHaveLength(0);
  });

  it('requires a CAPTCHA: missing -> 400 CAPTCHA_REQUIRED, invalid -> 400 CAPTCHA_FAILED, nothing is sent', async () => {
    const user = await createUser();
    const missing = await forgot({ email: user.email });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatchObject({
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });

    const invalid = await forgot({ email: user.email, captchaToken: 'nope' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('CAPTCHA_FAILED');
    expect(mailbox.messages).toHaveLength(0);
  });

  it('does not mail again during the 60 second cooldown but still answers 200', async () => {
    const user = await createUser();
    await forgot({ email: user.email, captchaToken: VALID_CAPTCHA }).expect(200);
    const second = await forgot({ email: user.email, captchaToken: VALID_CAPTCHA });
    expect(second.status).toBe(200);
    expect(mailbox.to(user.email)).toHaveLength(1);

    await prisma.oneTimeCode.updateMany({ data: { createdAt: new Date(Date.now() - 61_000) } });
    await forgot({ email: user.email, captchaToken: VALID_CAPTCHA }).expect(200);
    expect(mailbox.to(user.email)).toHaveLength(2);
  });

  it('writes the mail in Vietnamese for lang=vi', async () => {
    const user = await createUser();
    await forgot({ email: user.email, captchaToken: VALID_CAPTCHA, lang: 'vi' }).expect(200);
    expect(mailbox.lastTo(user.email).subject).toBe('Đặt lại mật khẩu E-Learning');
  });

  it('validates the email', async () => {
    const res = await forgot({ email: 'nope', captchaToken: VALID_CAPTCHA });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/reset-password', () => {
  async function requestCode(email: string): Promise<string> {
    await forgot({ email, captchaToken: VALID_CAPTCHA }).expect(200);
    return otpFrom(mailbox.lastTo(email));
  }

  it('sets the new password, revokes EVERY session and lets the user sign in with the new password only', async () => {
    const { user, session } = await createUserAndLogin(api);
    const second = (await loginViaApi(api, user.email, user.password, { deviceName: 'Laptop' }))
      .body.data;
    const code = await requestCode(user.email);
    mailbox.clear();

    const res = await reset({ email: user.email, code, newPassword: 'BrandNew2027' });

    expect(res.status).toBe(204);
    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
    await api.get(`${API}/auth/me`).set(bearer(second.accessToken)).expect(401);
    await api.post(`${API}/auth/refresh`).send({ refreshToken: session.refreshToken }).expect(401);
    expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);

    expect((await loginViaApi(api, user.email, user.password)).status).toBe(401); // mật khẩu cũ
    expect((await loginViaApi(api, user.email, 'BrandNew2027')).status).toBe(200);

    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'PASSWORD_RESET' } }),
    ).toBe(1);
    expect(mailbox.lastTo(user.email).subject).toBe('Your E-Learning password was changed');
  });

  it('also proves mailbox ownership: an unverified account becomes verified and an account lock is lifted', async () => {
    const { email } = await registerViaApi(api);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 3, lockedUntil: new Date(Date.now() + 600_000) },
    });
    const code = await requestCode(email);

    await reset({ email, code, newPassword: 'BrandNew2027' }).expect(204);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerifiedAt).toBeInstanceOf(Date);
    expect(after.failedLoginCount).toBe(0);
    expect(after.lockedUntil).toBeNull();
    expect((await loginViaApi(api, email, 'BrandNew2027')).status).toBe(200);
  });

  it('rejects a wrong code (400 INVALID_CODE) without changing the password', async () => {
    const user = await createUser();
    const code = await requestCode(user.email);
    const wrong = code === '000000' ? '111111' : '000000';

    const res = await reset({ email: user.email, code: wrong, newPassword: 'BrandNew2027' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_CODE', details: { attemptsLeft: 4 } });
    expect((await loginViaApi(api, user.email, user.password)).status).toBe(200);
  });

  it('burns the code after 5 wrong attempts (429)', async () => {
    const user = await createUser();
    const code = await requestCode(user.email);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i += 1) {
      await reset({ email: user.email, code: wrong, newPassword: 'BrandNew2027' }).expect(400);
    }
    const fifth = await reset({ email: user.email, code: wrong, newPassword: 'BrandNew2027' });
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    const good = await reset({ email: user.email, code, newPassword: 'BrandNew2027' });
    expect(good.status).toBe(429);
  });

  it('rejects an expired code (400 CODE_EXPIRED)', async () => {
    const user = await createUser();
    const code = await requestCode(user.email);
    await prisma.oneTimeCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await reset({ email: user.email, code, newPassword: 'BrandNew2027' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CODE_EXPIRED');
  });

  it('accepts a reset code only once', async () => {
    const user = await createUser();
    const code = await requestCode(user.email);
    await reset({ email: user.email, code, newPassword: 'BrandNew2027' }).expect(204);
    const again = await reset({ email: user.email, code, newPassword: 'Another2028' });
    expect(again.status).toBe(400);
  });

  it('does not accept a verification code as a reset code (codes are bound to their purpose)', async () => {
    const { email } = await registerViaApi(api);
    const verificationCode = otpFrom(mailbox.lastTo(email));
    const res = await reset({ email, code: verificationCode, newPassword: 'BrandNew2027' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CODE');
  });

  it('answers 400 INVALID_CODE for an unknown email', async () => {
    const res = await reset({
      email: 'nobody@example.com',
      code: '123456',
      newPassword: 'BrandNew2027',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CODE');
  });

  it('enforces the password rules (400 VALIDATION_ERROR)', async () => {
    const user = await createUser();
    const code = await requestCode(user.email);
    const res = await reset({ email: user.email, code, newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // lỗi validate không tiêu tốn lượt nhập mã
    await reset({ email: user.email, code, newPassword: 'BrandNew2027' }).expect(204);
  });

  it('keeps two-factor authentication enabled after a reset', async () => {
    const user = await createUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date(), totpSecretEnc: 'x' },
    });
    const code = await requestCode(user.email);
    await reset({ email: user.email, code, newPassword: 'BrandNew2027' }).expect(204);
    const login = await loginViaApi(api, user.email, 'BrandNew2027');
    expect(login.body.data.twoFactorRequired).toBe(true);
  });
});

describe('POST /me/password', () => {
  const change = (token: string, body: Record<string, unknown>) =>
    api.post(`${API}/me/password`).set(bearer(token)).send(body);

  it('changes the password, signs out the OTHER devices but keeps this one, and emails a notice', async () => {
    const user = await createUser({ session: false });
    const phone = (await loginViaApi(api, user.email, user.password, { deviceName: 'Phone' })).body
      .data;
    const laptop = (await loginViaApi(api, user.email, user.password, { deviceName: 'Laptop' }))
      .body.data;
    mailbox.clear();

    const res = await change(phone.accessToken, {
      currentPassword: user.password,
      newPassword: 'BrandNew2027',
    });

    expect(res.status).toBe(204);
    await api.get(`${API}/auth/me`).set(bearer(phone.accessToken)).expect(200);
    await api.get(`${API}/auth/me`).set(bearer(laptop.accessToken)).expect(401);
    await api.post(`${API}/auth/refresh`).send({ refreshToken: laptop.refreshToken }).expect(401);
    await api.post(`${API}/auth/refresh`).send({ refreshToken: phone.refreshToken }).expect(200);

    expect((await loginViaApi(api, user.email, user.password)).status).toBe(401);
    expect((await loginViaApi(api, user.email, 'BrandNew2027')).status).toBe(200);
    expect(mailbox.to(user.email).some((m) => m.subject.includes('password was changed'))).toBe(
      true,
    );
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'PASSWORD_CHANGED' } }),
    ).toBe(1);
  });

  it('rejects a wrong current password with 422 INVALID_PASSWORD and changes nothing', async () => {
    const { user, session } = await createUserAndLogin(api);
    const res = await change(session.accessToken, {
      currentPassword: 'WrongPass1',
      newPassword: 'BrandNew2027',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect((await loginViaApi(api, user.email, user.password)).status).toBe(200);
  });

  it('counts wrong current passwords towards the account lock (423 after 5)', async () => {
    const { session } = await createUserAndLogin(api);
    for (let i = 0; i < 4; i += 1) {
      const res = await change(session.accessToken, {
        currentPassword: 'WrongPass1',
        newPassword: 'BrandNew2027',
      });
      expect(res.status).toBe(422);
    }
    const fifth = await change(session.accessToken, {
      currentPassword: 'WrongPass1',
      newPassword: 'BrandNew2027',
    });
    expect(fifth.status).toBe(423);
    expect(fifth.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('rejects a new password equal to the current one and a weak one (400 VALIDATION_ERROR)', async () => {
    const { user, session } = await createUserAndLogin(api);
    const same = await change(session.accessToken, {
      currentPassword: user.password,
      newPassword: user.password,
    });
    expect(same.status).toBe(400);
    expect(same.body.error.details[0]).toMatchObject({ field: 'newPassword' });

    const weak = await change(session.accessToken, {
      currentPassword: user.password,
      newPassword: 'short',
    });
    expect(weak.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await api
      .post(`${API}/me/password`)
      .send({ currentPassword: 'a', newPassword: 'BrandNew2027' });
    expect(res.status).toBe(401);
  });

  it('keeps the refresh token of the current session working after the change', async () => {
    const { user, session } = await createUserAndLogin(api);
    await change(session.accessToken, {
      currentPassword: user.password,
      newPassword: 'BrandNew2027',
    }).expect(204);
    const sid = (jwt.decode(session.accessToken) as { sid: string }).sid;
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sid } })).revokedAt).toBeNull();
  });
});
