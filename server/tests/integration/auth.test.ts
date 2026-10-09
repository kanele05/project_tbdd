import jwt from 'jsonwebtoken';

import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';

import {
  bearer,
  createUserAndLogin,
  loginViaApi,
  registerAndVerify,
  registerViaApi,
} from '../helpers/authFlow';
import { authHeader } from '../helpers/authHelper';
import { mockTurnstile, restoreTurnstile, VALID_CAPTCHA } from '../helpers/captcha';
import { createUser, DEFAULT_TEST_PASSWORD } from '../helpers/factories';
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

const validRegister = {
  fullName: 'Martha Rosie',
  email: 'Martha.Rosie@Example.com',
  password: 'Learn2026',
  captchaToken: VALID_CAPTCHA,
};

describe('POST /auth/register', () => {
  it('creates an UNVERIFIED student, emails an OTP and returns no token (201)', async () => {
    const res = await api.post(`${API}/auth/register`).send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      user: {
        id: expect.any(String),
        email: 'martha.rosie@example.com', // lưu chữ thường
        fullName: 'Martha Rosie',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
      emailVerificationRequired: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|accessToken|refreshToken|"token"/);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'martha.rosie@example.com' },
    });
    expect(stored.emailVerifiedAt).toBeNull();
    expect(stored.passwordHash).not.toBe(validRegister.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(await prisma.session.count()).toBe(0);

    const mail = mailbox.lastTo('martha.rosie@example.com');
    expect(mail.subject).toBe('Verify your email for E-Learning');
    expect(mail.text).toMatch(/\b\d{6}\b/);
    expect(mail.from).toContain('no-reply');

    const stored2 = await prisma.oneTimeCode.findFirstOrThrow({ where: { userId: stored.id } });
    expect(stored2.purpose).toBe('VERIFY_EMAIL');
    expect(stored2.codeHash).not.toContain(otpFrom(mail)); // chỉ lưu hash
    expect(await prisma.authEvent.count({ where: { userId: stored.id, type: 'REGISTER' } })).toBe(
      1,
    );
    expect(await prisma.teacherProfile.count({ where: { userId: stored.id } })).toBe(0);
  });

  it('registers a TEACHER and creates its profile in the same request', async () => {
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email: 'teacher@example.com', role: 'TEACHER' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('TEACHER');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'teacher@example.com' } });
    expect(user.role).toBe('TEACHER');
    expect(await prisma.teacherProfile.findUnique({ where: { userId: user.id } })).toMatchObject({
      jobTitle: '',
      bio: '',
    });
  });

  it('accepts an explicit STUDENT role without creating a teacher profile', async () => {
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email: 'explicit-student@example.com', role: 'STUDENT' });

    expect(res.status).toBe(201);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'explicit-student@example.com' },
    });
    expect(user.role).toBe('STUDENT');
    expect(await prisma.teacherProfile.count({ where: { userId: user.id } })).toBe(0);
  });

  it.each(['ADMIN', 'UNKNOWN'])('rejects role %s without creating an account', async (role) => {
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, role, email: `${role.toLowerCase()}@example.com` });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.user.count()).toBe(0);
  });

  it('writes the email in Vietnamese for lang=vi or Accept-Language: vi', async () => {
    await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email: 'a1@example.com', lang: 'vi' });
    expect(mailbox.lastTo('a1@example.com').subject).toBe('Xác minh email E-Learning của bạn');

    await api
      .post(`${API}/auth/register`)
      .set('Accept-Language', 'vi-VN,vi;q=0.9,en;q=0.8')
      .send({ ...validRegister, email: 'a2@example.com' });
    expect(mailbox.lastTo('a2@example.com').subject).toBe('Xác minh email E-Learning của bạn');
  });

  it('requires a CAPTCHA token (400 CAPTCHA_REQUIRED) and creates nothing without it', async () => {
    const { captchaToken: _omit, ...withoutCaptcha } = validRegister;
    const res = await api.post(`${API}/auth/register`).send(withoutCaptcha);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });
    expect(await prisma.user.count()).toBe(0);
    expect(mailbox.messages).toHaveLength(0);
  });

  it('rejects an invalid CAPTCHA token (400 CAPTCHA_FAILED)', async () => {
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, captchaToken: 'bad-token' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_FAILED');
    expect(await prisma.user.count()).toBe(0);
  });

  it('fails safe with 503 CAPTCHA_UNAVAILABLE when Cloudflare cannot be reached', async () => {
    mockTurnstile().mockRejectedValue(new TypeError('fetch failed'));
    const res = await api.post(`${API}/auth/register`).send(validRegister);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CAPTCHA_UNAVAILABLE');
    expect(await prisma.user.count()).toBe(0);
  });

  it('returns 409 EMAIL_TAKEN when the email is already registered', async () => {
    await api.post(`${API}/auth/register`).send(validRegister).expect(201);
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email: 'martha.rosie@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns 400 VALIDATION_ERROR with per-field details for invalid input', async () => {
    const res = await api.post(`${API}/auth/register`).send({
      fullName: 'A',
      email: 'not-an-email',
      password: 'short',
      captchaToken: VALID_CAPTCHA,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = (res.body.error.details as { source: string; field: string }[]).map(
      (d) => `${d.source}.${d.field}`,
    );
    expect(fields).toEqual(
      expect.arrayContaining(['body.fullName', 'body.email', 'body.password']),
    );
  });

  it.each([
    ['no digit', 'OnlyLetters'],
    ['no letter', '12345678'],
    ['too short', 'Ab1'],
  ])('rejects a password with %s', async (_label, password) => {
    const res = await api.post(`${API}/auth/register`).send({ ...validRegister, password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('never creates a user when validation fails', async () => {
    await api.post(`${API}/auth/register`).send({ email: 'x@example.com' }).expect(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it('still answers 201 when the SMTP server is down (the user can request a new code)', async () => {
    mailbox.failNext = true;
    const res = await api.post(`${API}/auth/register`).send(validRegister);
    expect(res.status).toBe(201);
    expect(mailbox.messages).toHaveLength(0);
  });
});

describe('POST /auth/verify-email', () => {
  it('verifies the OTP, marks the email verified and signs the user in with a token pair', async () => {
    const { email, res } = await registerViaApi(api);
    expect(res.status).toBe(201);
    const code = otpFrom(mailbox.lastTo(email));

    const verify = await api
      .post(`${API}/auth/verify-email`)
      .send({ email, code, deviceName: 'Pixel 8' });

    expect(verify.status).toBe(200);
    expect(verify.body.data).toMatchObject({
      twoFactorRequired: false,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresIn: 900,
      user: { email },
    });
    expect(verify.body.data.token).toBe(verify.body.data.accessToken);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.deviceName).toBe('Pixel 8');

    const me = await api.get(`${API}/auth/me`).set(bearer(verify.body.data.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
    // Lần đầu xác minh không phải "thiết bị mới": không có thông báo / email cảnh báo.
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(mailbox.to(email)).toHaveLength(1);
  });

  it('keeps TEACHER role in the verified session and user DTO', async () => {
    const email = 'verified-teacher@example.com';
    await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email, role: 'TEACHER' })
      .expect(201);
    const code = otpFrom(mailbox.lastTo(email));

    const verify = await api.post(`${API}/auth/verify-email`).send({ email, code });

    expect(verify.status).toBe(200);
    expect(verify.body.data.user.role).toBe('TEACHER');
    const me = await api.get(`${API}/auth/me`).set(bearer(verify.body.data.accessToken));
    expect(me.body.data.role).toBe('TEACHER');
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await prisma.teacherProfile.count({ where: { userId: user.id } })).toBe(1);
  });

  it('rejects a wrong code with 400 INVALID_CODE and says how many attempts are left', async () => {
    const { email } = await registerViaApi(api);
    const res = await api.post(`${API}/auth/verify-email`).send({ email, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_CODE', details: { attemptsLeft: 4 } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerifiedAt).toBeNull();
  });

  it('burns the code after 5 wrong attempts (429 TOO_MANY_ATTEMPTS), even for the right code', async () => {
    const { email } = await registerViaApi(api);
    const goodCode = otpFrom(mailbox.lastTo(email));
    const wrong = goodCode === '000000' ? '111111' : '000000';

    for (let i = 1; i <= 4; i += 1) {
      const res = await api.post(`${API}/auth/verify-email`).send({ email, code: wrong });
      expect(res.body.error.code).toBe('INVALID_CODE');
    }
    const fifth = await api.post(`${API}/auth/verify-email`).send({ email, code: wrong });
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe('TOO_MANY_ATTEMPTS');

    const rightButBurned = await api
      .post(`${API}/auth/verify-email`)
      .send({ email, code: goodCode });
    expect(rightButBurned.status).toBe(429);
    expect(rightButBurned.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerifiedAt).toBeNull();

    // Xin mã mới (sau thời gian chờ) thì dùng lại được.
    await prisma.oneTimeCode.updateMany({ data: { createdAt: new Date(Date.now() - 61_000) } });
    await api.post(`${API}/auth/resend-verification`).send({ email }).expect(200);
    const fresh = otpFrom(mailbox.lastTo(email));
    await api.post(`${API}/auth/verify-email`).send({ email, code: fresh }).expect(200);
  });

  it('rejects an expired code with 400 CODE_EXPIRED', async () => {
    const { email } = await registerViaApi(api);
    const code = otpFrom(mailbox.lastTo(email));
    await prisma.oneTimeCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await api.post(`${API}/auth/verify-email`).send({ email, code });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CODE_EXPIRED');
  });

  it('uses a code only once and answers 409 ALREADY_VERIFIED afterwards', async () => {
    const { email } = await registerViaApi(api);
    const code = otpFrom(mailbox.lastTo(email));
    await api.post(`${API}/auth/verify-email`).send({ email, code }).expect(200);
    const again = await api.post(`${API}/auth/verify-email`).send({ email, code });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_VERIFIED');
  });

  it('answers 400 INVALID_CODE for an unknown email and 400 VALIDATION_ERROR for a malformed code', async () => {
    const unknown = await api
      .post(`${API}/auth/verify-email`)
      .send({ email: 'nobody@example.com', code: '123456' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('INVALID_CODE');

    const malformed = await api
      .post(`${API}/auth/verify-email`)
      .send({ email: 'a@example.com', code: '12ab' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('only the newest code works after a resend', async () => {
    const { email } = await registerViaApi(api);
    const oldCode = otpFrom(mailbox.lastTo(email));
    await prisma.oneTimeCode.updateMany({ data: { createdAt: new Date(Date.now() - 61_000) } });
    await api.post(`${API}/auth/resend-verification`).send({ email }).expect(200);
    const newCode = otpFrom(mailbox.lastTo(email));
    expect(await prisma.oneTimeCode.count()).toBe(1);

    if (newCode !== oldCode) {
      const stale = await api.post(`${API}/auth/verify-email`).send({ email, code: oldCode });
      expect(stale.status).toBe(400);
    }
    await api.post(`${API}/auth/verify-email`).send({ email, code: newCode }).expect(200);
  });
});

describe('POST /auth/resend-verification', () => {
  it('returns 429 RESEND_TOO_SOON with retryAfterSec inside the 60 second cooldown', async () => {
    const { email } = await registerViaApi(api);
    const res = await api.post(`${API}/auth/resend-verification`).send({ email });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RESEND_TOO_SOON');
    expect(res.body.error.details.retryAfterSec).toBeGreaterThan(0);
    expect(res.body.error.details.retryAfterSec).toBeLessThanOrEqual(60);
    expect(res.headers['retry-after']).toBe(String(res.body.error.details.retryAfterSec));
    expect(mailbox.to(email)).toHaveLength(1);
  });

  it('sends a new code after the cooldown', async () => {
    const { email } = await registerViaApi(api);
    await prisma.oneTimeCode.updateMany({ data: { createdAt: new Date(Date.now() - 61_000) } });
    const res = await api.post(`${API}/auth/resend-verification`).send({ email });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ sent: true, codeExpiresIn: 600, resendAfter: 60 });
    expect(mailbox.to(email)).toHaveLength(2);
  });

  it('answers 200 without sending anything for unknown or already verified emails', async () => {
    const unknown = await api
      .post(`${API}/auth/resend-verification`)
      .send({ email: 'nobody@example.com' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.data.sent).toBe(true);

    const user = await createUser();
    const verified = await api.post(`${API}/auth/resend-verification`).send({ email: user.email });
    expect(verified.status).toBe(200);
    expect(mailbox.messages).toHaveLength(0);
  });

  it('validates the email', async () => {
    const res = await api.post(`${API}/auth/resend-verification`).send({ email: 'nope' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns a token pair + user for correct credentials (email is case-insensitive) and creates a session', async () => {
    const user = await createUser({
      email: 'martha@example.com',
      fullName: 'Martha Rosie',
      session: false,
    });
    const res = await api.post(`${API}/auth/login`).send({
      email: ' MARTHA@example.com ',
      password: DEFAULT_TEST_PASSWORD,
      deviceName: 'Pixel 8',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      twoFactorRequired: false,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresIn: 900,
      user: { id: user.id, email: 'martha@example.com' },
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const claims = jwt.decode(res.body.data.accessToken) as {
      sub: string;
      sid: string;
      exp: number;
      iat: number;
    };
    expect(claims.sub).toBe(user.id);
    expect(claims.exp - claims.iat).toBe(900);
    const session = await prisma.session.findUniqueOrThrow({ where: { id: claims.sid } });
    expect(session).toMatchObject({ userId: user.id, deviceName: 'Pixel 8', revokedAt: null });
    expect(session.ipAddress).toBe('127.0.0.x');

    // refresh token chỉ lưu hash
    const tokens = await prisma.refreshToken.findMany({ where: { sessionId: session.id } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.tokenHash).not.toBe(res.body.data.refreshToken);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'LOGIN_SUCCESS' } }),
    ).toBe(1);
  });

  it('keeps the deprecated `token` field (= accessToken) so the current mobile app still works', async () => {
    const user = await createUser({ session: false });
    const res = await loginViaApi(api, user.email, user.password);
    expect(res.body.data.token).toBe(res.body.data.accessToken);
    const me = await api.get(`${API}/auth/me`).set(bearer(res.body.data.token));
    expect(me.status).toBe(200);
    expect(me.body.data).toEqual(res.body.data.user);
  });

  it('guesses the device name from the User-Agent when the app sends none', async () => {
    const user = await createUser({ session: false });
    const res = await api
      .post(`${API}/auth/login`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      )
      .send({ email: user.email, password: user.password });
    const claims = jwt.decode(res.body.data.accessToken) as { sid: string };
    expect((await prisma.session.findUniqueOrThrow({ where: { id: claims.sid } })).deviceName).toBe(
      'Chrome on Windows',
    );
  });

  it('returns 403 EMAIL_NOT_VERIFIED with the data the app needs for the OTP screen, and sends a code', async () => {
    const { email, password } = await registerViaApi(api, { email: 'pending@example.com' });
    mailbox.clear();
    await prisma.oneTimeCode.deleteMany(); // mã đăng ký đã mất / hết hạn

    const res = await loginViaApi(api, email, password);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      details: { email: 'pending@example.com', resendAfter: expect.any(Number) },
    });
    expect(res.body.data).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);

    // đã tự gửi mã mới -> nhập mã là vào được
    const code = otpFrom(mailbox.lastTo(email));
    const verify = await api.post(`${API}/auth/verify-email`).send({ email, code });
    expect(verify.status).toBe(200);
  });

  it('does not send another code on every login attempt while one is still pending', async () => {
    const { email, password } = await registerViaApi(api);
    expect(mailbox.to(email)).toHaveLength(1);
    await loginViaApi(api, email, password).expect(403);
    await loginViaApi(api, email, password).expect(403);
    expect(mailbox.to(email)).toHaveLength(1);
  });

  it('does not reveal an unverified account when the password is wrong (plain 401)', async () => {
    const { email } = await registerViaApi(api);
    const res = await loginViaApi(api, email, 'WrongPass1');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for a wrong password', async () => {
    await createUser({ email: 'martha@example.com' });
    const res = await loginViaApi(api, 'martha@example.com', 'WrongPass1');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password',
      details: { captchaRequired: false },
    });
  });

  it('returns exactly the same 401 for an unknown email (no account enumeration)', async () => {
    await createUser({ email: 'martha@example.com' });
    const known = await loginViaApi(api, 'martha@example.com', 'WrongPass1');
    const unknown = await loginViaApi(api, 'nobody-here@example.com', 'WrongPass1');

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
  });

  it('returns 400 VALIDATION_ERROR when the body is incomplete', async () => {
    const res = await api.post(`${API}/auth/login`).send({ email: 'martha@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user for the access token from /auth/login', async () => {
    const { session } = await createUserAndLogin(api);
    const res = await api.get(`${API}/auth/me`).set(bearer(session.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(session.user);
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await api.get(`${API}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for a malformed or wrongly signed token', async () => {
    const malformed = await api.get(`${API}/auth/me`).set('Authorization', 'Bearer not-a-jwt');
    expect(malformed.status).toBe(401);
    expect(malformed.body.error.code).toBe('UNAUTHORIZED');

    const forged = jwt.sign(
      { role: 'STUDENT', sid: 's', typ: 'access' },
      'another-secret-'.repeat(3),
      {
        subject: 'user-1',
      },
    );
    const res = await api.get(`${API}/auth/me`).set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the access token is expired', async () => {
    const user = await createUser();
    const expired = jwt.sign(
      { role: 'STUDENT', sid: user.sessionId, typ: 'access' },
      env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: -10,
      },
    );
    const res = await api.get(`${API}/auth/me`).set(bearer(expired));
    expect(res.status).toBe(401);
  });

  it('rejects an old-style token without a session id (the former 7-day JWT)', async () => {
    const user = await createUser();
    const legacy = jwt.sign({ role: 'STUDENT' }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: '7d',
    });
    const res = await api.get(`${API}/auth/me`).set(bearer(legacy));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is valid but the user (and its sessions) no longer exist', async () => {
    const res = await api.get(`${API}/auth/me`).set(authHeader({ id: 'deleted-user-id' }));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 right after the account is deleted (sessions are removed with it)', async () => {
    const { user, session } = await createUserAndLogin(api);
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api.get(`${API}/auth/me`).set(bearer(session.accessToken));
    expect(res.status).toBe(401);
  });

  it('is not slowed down by the sensitive-endpoint rate limits (GET /me stays open)', async () => {
    const { session } = await registerAndVerify(api);
    for (let i = 0; i < 15; i += 1) {
      await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(200);
    }
  });
});
