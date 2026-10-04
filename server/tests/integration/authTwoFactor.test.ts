import jwt from 'jsonwebtoken';

import { env } from '@/config/env';
import { decryptSecret, hashRecoveryCode, normalizeRecoveryCode } from '@/lib/authCrypto';
import { prisma } from '@/lib/prisma';

import {
  bearer,
  createUserAndLogin,
  enableTwoFactorViaApi,
  loginViaApi,
  totpCode,
} from '../helpers/authFlow';
import { mockTurnstile, restoreTurnstile, VALID_CAPTCHA } from '../helpers/captcha';
import { installMailbox, mailbox, uninstallMailbox } from '../helpers/mailbox';
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

/** Tạo user đã đăng nhập + đã bật 2FA. */
async function userWithTwoFactor() {
  const { user, session } = await createUserAndLogin(api);
  const { secret, recoveryCodes } = await enableTwoFactorViaApi(api, session.accessToken);
  return { user, session, secret, recoveryCodes };
}

/** Đăng nhập bước 1 (mật khẩu) -> challengeToken. */
async function startTwoStepLogin(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<string> {
  const res = await loginViaApi(api, email, password, captchaToken ? { captchaToken } : {});
  expect(res.status).toBe(200);
  expect(res.body.data.twoFactorRequired).toBe(true);
  return res.body.data.challengeToken as string;
}

const verify2fa = (body: Record<string, unknown>) => api.post(`${API}/auth/2fa/verify`).send(body);

describe('POST /me/2fa/setup', () => {
  it('returns a base32 secret and an otpauth URL, storing the secret ENCRYPTED and still disabled', async () => {
    const { user, session } = await createUserAndLogin(api);

    const res = await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.secret).toMatch(/^[A-Z2-7]{32}$/);
    const url = new URL(res.body.data.otpauthUrl);
    expect(url.protocol).toBe('otpauth:');
    expect(url.searchParams.get('secret')).toBe(res.body.data.secret);
    expect(url.searchParams.get('issuer')).toBe('E-Learning');
    expect(decodeURIComponent(url.pathname)).toBe(`/E-Learning:${user.email}`);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.totpEnabledAt).toBeNull();
    expect(stored.totpSecretEnc).toMatch(/^v1\./);
    expect(stored.totpSecretEnc).not.toContain(res.body.data.secret);
    expect(decryptSecret(stored.totpSecretEnc ?? '')).toBe(res.body.data.secret);
  });

  it('replaces a pending secret when called again', async () => {
    const { session } = await createUserAndLogin(api);
    const first = await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));
    const second = await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));
    expect(second.body.data.secret).not.toBe(first.body.data.secret);
  });

  it('returns 409 TWO_FACTOR_ALREADY_ENABLED once 2FA is on, and 401 without a token', async () => {
    const { session } = await userWithTwoFactor();
    const res = await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TWO_FACTOR_ALREADY_ENABLED');
    await api.post(`${API}/me/2fa/setup`).expect(401);
  });
});

describe('POST /me/2fa/enable', () => {
  it('turns 2FA on with a valid code and returns 10 one-time recovery codes (hashes stored)', async () => {
    const { user, session } = await createUserAndLogin(api);
    const setup = await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));

    const res = await api
      .post(`${API}/me/2fa/enable`)
      .set(bearer(session.accessToken))
      .send({ code: totpCode(setup.body.data.secret) });

    expect(res.status).toBe(200);
    const codes = res.body.data.recoveryCodes as string[];
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.totpEnabledAt).toBeInstanceOf(Date);
    const rows = await prisma.recoveryCode.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.codeHash).sort()).toEqual(
      codes.map((c) => hashRecoveryCode(user.id, normalizeRecoveryCode(c) ?? '')).sort(),
    );
    expect(JSON.stringify(rows)).not.toContain(codes[0]);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'TWO_FACTOR_ENABLED' } }),
    ).toBe(1);

    const overview = await api.get(`${API}/me/security`).set(bearer(session.accessToken));
    expect(overview.body.data).toEqual({
      emailVerified: true,
      twoFactorEnabled: true,
      recoveryCodesRemaining: 10,
    });
  });

  it('rejects a wrong code (400 INVALID_CODE) and keeps 2FA off', async () => {
    const { user, session } = await createUserAndLogin(api);
    await api.post(`${API}/me/2fa/setup`).set(bearer(session.accessToken));
    const res = await api
      .post(`${API}/me/2fa/enable`)
      .set(bearer(session.accessToken))
      .send({ code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CODE');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).totpEnabledAt,
    ).toBeNull();
  });

  it('requires the setup step first (422 TWO_FACTOR_NOT_SETUP)', async () => {
    const { session } = await createUserAndLogin(api);
    const res = await api
      .post(`${API}/me/2fa/enable`)
      .set(bearer(session.accessToken))
      .send({ code: '123456' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('TWO_FACTOR_NOT_SETUP');
  });

  it('refuses to enable twice (409) and validates the code format (400)', async () => {
    const { session, secret } = await userWithTwoFactor();
    const again = await api
      .post(`${API}/me/2fa/enable`)
      .set(bearer(session.accessToken))
      .send({ code: totpCode(secret, 1) });
    expect(again.status).toBe(409);

    const malformed = await api
      .post(`${API}/me/2fa/enable`)
      .set(bearer(session.accessToken))
      .send({ code: 'abc' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('two-step login: POST /auth/login -> POST /auth/2fa/verify', () => {
  it('returns a 5 minute challenge instead of tokens when the password is right', async () => {
    const { user } = await userWithTwoFactor();
    const res = await loginViaApi(api, user.email, user.password);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      twoFactorRequired: true,
      challengeToken: expect.any(String),
      challengeExpiresIn: 300,
    });
    expect(res.body.data).not.toHaveProperty('accessToken');
    expect(res.body.data).not.toHaveProperty('refreshToken');
    expect(res.body.data).not.toHaveProperty('token');
    const claims = jwt.decode(res.body.data.challengeToken) as {
      exp: number;
      iat: number;
      sub: string;
    };
    expect(claims.exp - claims.iat).toBe(300);
    expect(claims.sub).toBe(user.id);
    // chưa tạo phiên mới (chỉ có phiên đăng nhập ban đầu để bật 2FA)
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });

  it('does not accept the challengeToken as an access token', async () => {
    const { user } = await userWithTwoFactor();
    const challenge = await startTwoStepLogin(user.email, user.password);
    await api.get(`${API}/auth/me`).set(bearer(challenge)).expect(401);
  });

  it('issues the token pair after a valid TOTP code, and the same code cannot be used twice (replay)', async () => {
    const { user, secret } = await userWithTwoFactor();
    const challenge = await startTwoStepLogin(user.email, user.password);
    const code = totpCode(secret, 1); // bước kế tiếp: bước hiện tại đã dùng để bật 2FA

    const ok = await verify2fa({ challengeToken: challenge, code, deviceName: 'Pixel 8' });

    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      twoFactorRequired: false,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresIn: 900,
      user: { id: user.id },
    });
    expect(ok.body.data.token).toBe(ok.body.data.accessToken);
    await api.get(`${API}/auth/me`).set(bearer(ok.body.data.accessToken)).expect(200);
    const sid = (jwt.decode(ok.body.data.accessToken) as { sid: string }).sid;
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sid } })).deviceName).toBe(
      'Pixel 8',
    );

    // cùng mã, cùng challenge -> bị từ chối (đã dùng)
    const replay = await verify2fa({ challengeToken: challenge, code });
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe('INVALID_CODE');
    // cả với challenge mới
    const challenge2 = await startTwoStepLogin(user.email, user.password);
    expect((await verify2fa({ challengeToken: challenge2, code })).status).toBe(400);
  });

  it('rejects a code from a step that is not newer than the last used one, accepts the next step', async () => {
    const { user, secret } = await userWithTwoFactor();
    // Bước đã dùng khi bật 2FA là S; mã của S-1 (≤ lastStep) phải bị từ chối, mã của S+1 được chấp nhận (lệch +1 bước).
    const challenge = await startTwoStepLogin(user.email, user.password);
    const old = await verify2fa({ challengeToken: challenge, code: totpCode(secret, -1) });
    expect(old.status).toBe(400);
    const next = await verify2fa({ challengeToken: challenge, code: totpCode(secret, 1) });
    expect(next.status).toBe(200);
  });

  it('rejects a wrong code with 400 INVALID_CODE and attemptsLeft, creating no session', async () => {
    const { user } = await userWithTwoFactor();
    const challenge = await startTwoStepLogin(user.email, user.password);

    const res = await verify2fa({ challengeToken: challenge, code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_CODE', details: { attemptsLeft: 4 } });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'TWO_FACTOR_FAILED' } }),
    ).toBe(1);
  });

  it('locks the account after 5 wrong codes, and logging in again with the password does NOT reset the counter', async () => {
    const { user, secret } = await userWithTwoFactor();
    let challenge = await startTwoStepLogin(user.email, user.password);

    for (let i = 0; i < 3; i += 1) {
      await verify2fa({ challengeToken: challenge, code: '000000' }).expect(400);
    }
    // Kẻ biết mật khẩu đăng nhập lại để "xin" thêm lượt đoán: bộ đếm vẫn giữ nguyên
    // (và từ lần sai thứ 3 đăng nhập đòi CAPTCHA).
    const needsCaptcha = await loginViaApi(api, user.email, user.password);
    expect(needsCaptcha.status).toBe(400);
    expect(needsCaptcha.body.error.code).toBe('CAPTCHA_REQUIRED');
    challenge = await startTwoStepLogin(user.email, user.password, VALID_CAPTCHA);
    const fourth = await verify2fa({ challengeToken: challenge, code: '000000' });
    expect(fourth.status).toBe(400);
    expect(fourth.body.error.details.attemptsLeft).toBe(1);
    const fifth = await verify2fa({ challengeToken: challenge, code: '000000' });
    expect(fifth.status).toBe(423);
    expect(fifth.body.error).toMatchObject({
      code: 'ACCOUNT_LOCKED',
      details: { retryAfterSec: expect.any(Number) },
    });
    expect(fifth.headers['retry-after']).toBeDefined();

    // đang khóa: kể cả mã đúng, mật khẩu đúng cũng bị chặn
    expect((await verify2fa({ challengeToken: challenge, code: totpCode(secret, 1) })).status).toBe(
      423,
    );
    const login = await loginViaApi(api, user.email, user.password);
    expect(login.status).toBe(423);
  });

  it('logs the user in with a recovery code, and each recovery code works only once', async () => {
    const { user, recoveryCodes } = await userWithTwoFactor();
    const code = recoveryCodes[0] ?? '';

    const first = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: code,
    });
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toEqual(expect.any(String));
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'RECOVERY_CODE_USED' } }),
    ).toBe(1);

    const second = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: code,
    });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('INVALID_CODE');

    // đã dùng 1/10
    const overview = await api.get(`${API}/me/security`).set(bearer(first.body.data.accessToken));
    expect(overview.body.data.recoveryCodesRemaining).toBe(9);
  });

  it('accepts a recovery code typed in lowercase without the dash', async () => {
    const { user, recoveryCodes } = await userWithTwoFactor();
    const typed = (recoveryCodes[1] ?? '').toLowerCase().replace('-', ' ');
    const res = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: typed,
    });
    expect(res.status).toBe(200);
  });

  it('rejects an unknown recovery code', async () => {
    const { user } = await userWithTwoFactor();
    const res = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: 'AAAAA-BBBBB',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CODE');
  });

  it.each([
    ['garbage', 'garbage'],
    ['an access token', null],
  ])('rejects %s as challenge with 401 INVALID_CHALLENGE', async (_label, value) => {
    const { session } = await userWithTwoFactor();
    const challengeToken = value ?? session.accessToken;
    const res = await verify2fa({ challengeToken, code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CHALLENGE');
  });

  it('rejects an expired challenge', async () => {
    const { user } = await userWithTwoFactor();
    const expired = jwt.sign({ typ: '2fa-challenge' }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: -1,
    });
    const res = await verify2fa({ challengeToken: expired, code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CHALLENGE');
  });

  it('rejects a challenge once 2FA was disabled', async () => {
    const { user } = await userWithTwoFactor();
    const challenge = await startTwoStepLogin(user.email, user.password);
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: null } });
    const res = await verify2fa({ challengeToken: challenge, code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CHALLENGE');
  });

  it('requires exactly one of code / recoveryCode (400 VALIDATION_ERROR)', async () => {
    const { user, recoveryCodes } = await userWithTwoFactor();
    const challengeToken = await startTwoStepLogin(user.email, user.password);
    const none = await verify2fa({ challengeToken });
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe('VALIDATION_ERROR');
    const both = await verify2fa({
      challengeToken,
      code: '123456',
      recoveryCode: recoveryCodes[0],
    });
    expect(both.status).toBe(400);
    const malformed = await verify2fa({ challengeToken, code: '12' });
    expect(malformed.status).toBe(400);
  });

  it('alerts about a new device after the second step as well', async () => {
    const { user, secret } = await userWithTwoFactor();
    // createUserAndLogin dùng deviceName mặc định "Unknown device"; đăng nhập 2 bước từ thiết bị khác
    const challenge = await startTwoStepLogin(user.email, user.password);
    mailbox.clear();
    await verify2fa({
      challengeToken: challenge,
      code: totpCode(secret, 1),
      deviceName: 'Brand new tablet',
    }).expect(200);
    expect(mailbox.lastTo(user.email).subject).toBe('New sign-in to your E-Learning account');
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe('POST /me/2fa/disable', () => {
  it('turns 2FA off with the password and a TOTP code, wiping the secret and the recovery codes', async () => {
    const { user, session, secret } = await userWithTwoFactor();

    const res = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: user.password, code: totpCode(secret, 1) });

    expect(res.status).toBe(204);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null });
    expect(await prisma.recoveryCode.count({ where: { userId: user.id } })).toBe(0);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'TWO_FACTOR_DISABLED' } }),
    ).toBe(1);

    // đăng nhập lại không cần 2FA nữa
    const login = await loginViaApi(api, user.email, user.password);
    expect(login.body.data.twoFactorRequired).toBe(false);
    expect(login.body.data.accessToken).toEqual(expect.any(String));
  });

  it('also works with a recovery code instead of a TOTP code', async () => {
    const { user, session, recoveryCodes } = await userWithTwoFactor();
    const res = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: user.password, recoveryCode: recoveryCodes[2] });
    expect(res.status).toBe(204);
  });

  it('rejects a wrong password (422 INVALID_PASSWORD) and a wrong code (400 INVALID_CODE); 2FA stays on', async () => {
    const { user, session, secret } = await userWithTwoFactor();
    const badPassword = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: 'WrongPass1', code: totpCode(secret, 1) });
    expect(badPassword.status).toBe(422);
    expect(badPassword.body.error.code).toBe('INVALID_PASSWORD');

    const badCode = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: user.password, code: '000000' });
    expect(badCode.status).toBe(400);
    expect(badCode.body.error.code).toBe('INVALID_CODE');

    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).totpEnabledAt,
    ).toBeInstanceOf(Date);
  });

  it('answers 422 TWO_FACTOR_NOT_ENABLED when 2FA is off, and validates the body', async () => {
    const { user, session } = await createUserAndLogin(api);
    const off = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: user.password, code: '123456' });
    expect(off.status).toBe(422);
    expect(off.body.error.code).toBe('TWO_FACTOR_NOT_ENABLED');

    const invalid = await api
      .post(`${API}/me/2fa/disable`)
      .set(bearer(session.accessToken))
      .send({ password: user.password });
    expect(invalid.status).toBe(400);
    await api.post(`${API}/me/2fa/disable`).send({ password: 'x', code: '123456' }).expect(401);
  });
});

describe('POST /me/2fa/recovery-codes', () => {
  it('replaces all recovery codes: the new ones work, the old ones do not', async () => {
    const { user, session, secret, recoveryCodes } = await userWithTwoFactor();

    const res = await api
      .post(`${API}/me/2fa/recovery-codes`)
      .set(bearer(session.accessToken))
      .send({ code: totpCode(secret, 1) });

    expect(res.status).toBe(200);
    const fresh = res.body.data.recoveryCodes as string[];
    expect(fresh).toHaveLength(10);
    expect(fresh.filter((c) => recoveryCodes.includes(c))).toHaveLength(0);
    expect(await prisma.recoveryCode.count({ where: { userId: user.id } })).toBe(10);
    expect(
      await prisma.authEvent.count({
        where: { userId: user.id, type: 'RECOVERY_CODES_REGENERATED' },
      }),
    ).toBe(1);

    const oldOne = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: recoveryCodes[0],
    });
    expect(oldOne.status).toBe(400);
    const newOne = await verify2fa({
      challengeToken: await startTwoStepLogin(user.email, user.password),
      recoveryCode: fresh[0],
    });
    expect(newOne.status).toBe(200);
  });

  it('can be authorised with a recovery code', async () => {
    const { session, recoveryCodes } = await userWithTwoFactor();
    const res = await api
      .post(`${API}/me/2fa/recovery-codes`)
      .set(bearer(session.accessToken))
      .send({ recoveryCode: recoveryCodes[0] });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong code (400), a missing code (400), 2FA being off (422) and no token (401)', async () => {
    const { session } = await userWithTwoFactor();
    const wrong = await api
      .post(`${API}/me/2fa/recovery-codes`)
      .set(bearer(session.accessToken))
      .send({ code: '000000' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('INVALID_CODE');
    await api
      .post(`${API}/me/2fa/recovery-codes`)
      .set(bearer(session.accessToken))
      .send({})
      .expect(400);

    const other = await createUserAndLogin(api);
    const off = await api
      .post(`${API}/me/2fa/recovery-codes`)
      .set(bearer(other.session.accessToken))
      .send({ code: '123456' });
    expect(off.status).toBe(422);
    expect(off.body.error.code).toBe('TWO_FACTOR_NOT_ENABLED');
    await api.post(`${API}/me/2fa/recovery-codes`).send({ code: '123456' }).expect(401);
  });
});
