import { prisma } from '@/lib/prisma';

import { bearer, loginViaApi } from '../helpers/authFlow';
import { mockTurnstile, restoreTurnstile, VALID_CAPTCHA } from '../helpers/captcha';
import { createUser, uniq } from '../helpers/factories';
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

const WRONG = 'WrongPass1';

describe('CAPTCHA at login after 3 wrong attempts (AUTH-05)', () => {
  it('does not ask for a CAPTCHA before the 3rd failure and flags captchaRequired on the 3rd', async () => {
    const user = await createUser();
    const first = await loginViaApi(api, user.email, WRONG);
    const second = await loginViaApi(api, user.email, WRONG);
    const third = await loginViaApi(api, user.email, WRONG);

    expect(first.body.error.details).toEqual({ captchaRequired: false });
    expect(second.body.error.details).toEqual({ captchaRequired: false });
    expect(third.status).toBe(401);
    expect(third.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      details: { captchaRequired: true },
    });
  });

  it('then demands a CAPTCHA token (400 CAPTCHA_REQUIRED + details.captchaRequired) even for the right password', async () => {
    const user = await createUser({ session: false });
    for (let i = 0; i < 3; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);

    const res = await loginViaApi(api, user.email, user.password);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'CAPTCHA_REQUIRED',
      details: { captchaRequired: true },
    });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects a bad CAPTCHA token (400 CAPTCHA_FAILED) and accepts a valid one (login proceeds)', async () => {
    const user = await createUser();
    for (let i = 0; i < 3; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);

    const bad = await loginViaApi(api, user.email, user.password, { captchaToken: 'bad' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({
      code: 'CAPTCHA_FAILED',
      details: { captchaRequired: true },
    });

    const good = await loginViaApi(api, user.email, user.password, { captchaToken: VALID_CAPTCHA });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toEqual(expect.any(String));
  });

  it('a valid CAPTCHA does not make a wrong password succeed (401, counter keeps growing)', async () => {
    const user = await createUser();
    for (let i = 0; i < 3; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);
    const res = await loginViaApi(api, user.email, WRONG, { captchaToken: VALID_CAPTCHA });
    expect(res.status).toBe(401);
    expect(res.body.error.details).toEqual({ captchaRequired: true });
  });

  it('a successful login clears the counter: the CAPTCHA is not asked again', async () => {
    const user = await createUser();
    for (let i = 0; i < 3; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);
    await loginViaApi(api, user.email, user.password, { captchaToken: VALID_CAPTCHA }).expect(200);

    const next = await loginViaApi(api, user.email, user.password);
    expect(next.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).failedLoginCount).toBe(
      0,
    );
  });

  it('treats an unknown email exactly like a real account (same hints, same demands)', async () => {
    const email = `${uniq('ghost')}@example.com`;
    const res1 = await loginViaApi(api, email, WRONG);
    await loginViaApi(api, email, WRONG);
    const res3 = await loginViaApi(api, email, WRONG);
    expect(res1.body.error.details).toEqual({ captchaRequired: false });
    expect(res3.body.error.details).toEqual({ captchaRequired: true });

    const needs = await loginViaApi(api, email, WRONG);
    expect(needs.status).toBe(400);
    expect(needs.body.error.code).toBe('CAPTCHA_REQUIRED');
  });
});

describe('account lock after 5 failures (AUTH-06)', () => {
  /** 5 lần sai liên tiếp (từ lần 4 kèm CAPTCHA); trả response của lần thứ 5. */
  async function failFiveTimes(email: string) {
    for (let i = 1; i <= 4; i += 1) {
      const res = await loginViaApi(
        api,
        email,
        WRONG,
        i >= 4 ? { captchaToken: VALID_CAPTCHA } : {},
      );
      expect(res.status).toBe(401);
    }
    return loginViaApi(api, email, WRONG, { captchaToken: VALID_CAPTCHA });
  }

  it('locks the account for 15 minutes on the 5th wrong attempt: 423 ACCOUNT_LOCKED with retryAfterSec', async () => {
    const user = await createUser();

    const fifth = await failFiveTimes(user.email);

    expect(fifth.status).toBe(423);
    expect(fifth.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(fifth.body.error.details.retryAfterSec).toBeGreaterThan(890);
    expect(fifth.body.error.details.retryAfterSec).toBeLessThanOrEqual(900);
    expect(fifth.headers['retry-after']).toBe(String(fifth.body.error.details.retryAfterSec));

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.lockedUntil?.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
    expect(await prisma.authEvent.count({ where: { userId: user.id, type: 'LOGIN_LOCKED' } })).toBe(
      1,
    );
    expect(await prisma.authEvent.count({ where: { userId: user.id, type: 'LOGIN_FAILED' } })).toBe(
      4,
    );
  });

  it('refuses even the CORRECT password while locked, without needing the CAPTCHA', async () => {
    const user = await createUser({ session: false });
    await failFiveTimes(user.email);

    const res = await loginViaApi(api, user.email, user.password);
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(res.body.error.message).toBe('Too many failed attempts. Try again later.');
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('lets the user in again after the lock expires, with a fresh set of attempts', async () => {
    const user = await createUser();
    await failFiveTimes(user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });

    const res = await loginViaApi(api, user.email, user.password);
    expect(res.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.lockedUntil).toBeNull();
    expect(stored.failedLoginCount).toBe(0);
  });

  it('only counts CONSECUTIVE failures: a success in between resets the count', async () => {
    const user = await createUser();
    for (let i = 0; i < 2; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);
    await loginViaApi(api, user.email, user.password).expect(200);
    for (let i = 0; i < 2; i += 1) await loginViaApi(api, user.email, WRONG).expect(401);
    const res = await loginViaApi(api, user.email, user.password);
    expect(res.status).toBe(200); // chưa bị khóa
  });

  it('locks an UNKNOWN email the same way, so a lock reveals nothing about which emails exist', async () => {
    const email = `${uniq('ghost')}@example.com`;
    const known = await createUser();
    const realFifth = await failFiveTimes(known.email);
    const ghostFifth = await failFiveTimes(email);

    expect(ghostFifth.status).toBe(realFifth.status);
    expect(ghostFifth.body.error.code).toBe(realFifth.body.error.code);
    expect(ghostFifth.body.error.message).toBe(realFifth.body.error.message);
    const after = await loginViaApi(api, email, WRONG);
    expect(after.status).toBe(423);
  });

  it('does not lock other accounts', async () => {
    const victim = await createUser();
    const other = await createUser();
    await failFiveTimes(victim.email);
    await loginViaApi(api, other.email, other.password).expect(200);
  });

  it('keeps the error for a wrong password generic: no hint whether the email exists or what failed', async () => {
    const user = await createUser();
    const wrongPassword = await loginViaApi(api, user.email, WRONG);
    const unknownEmail = await loginViaApi(api, `${uniq('x')}@example.com`, WRONG);
    expect(wrongPassword.body.error.message).toBe('Incorrect email or password');
    expect(unknownEmail.body.error.message).toBe('Incorrect email or password');
    expect(JSON.stringify(wrongPassword.body)).not.toMatch(/exist|not found|unknown/i);
  });
});

describe('security event log (AuthEvent)', () => {
  it('records sign-in successes and failures with a masked IP, without any secrets', async () => {
    const user = await createUser({ session: false });
    await loginViaApi(api, user.email, WRONG).expect(401);
    const ok = await loginViaApi(api, user.email, user.password, { deviceName: 'Pixel 8' });
    await api.post(`${API}/auth/logout`).set(bearer(ok.body.data.accessToken)).expect(204);

    const events = await prisma.authEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((e) => e.type)).toEqual(['LOGIN_FAILED', 'LOGIN_SUCCESS', 'LOGOUT']);
    expect(events[1]?.sessionId).toEqual(expect.any(String));
    expect(events[1]?.metadata).toEqual({ method: 'password' });
    for (const event of events) expect(event.ipAddress).toBe('127.0.0.x');

    const dump = JSON.stringify(events);
    expect(dump).not.toContain(user.password);
    expect(dump).not.toContain(WRONG);
    expect(dump).not.toContain(ok.body.data.accessToken);
    expect(dump).not.toContain(ok.body.data.refreshToken);
  });

  it('does not record anything for an unknown email (no account to attach it to, no PII stored)', async () => {
    await loginViaApi(api, `${uniq('ghost')}@example.com`, WRONG).expect(401);
    expect(await prisma.authEvent.count()).toBe(0);
  });

  it('is removed together with the account', async () => {
    const user = await createUser({ session: false });
    await loginViaApi(api, user.email, user.password).expect(200);
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.authEvent.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  });
});

describe('rate limiting is disabled in tests but the endpoints exist', () => {
  it('answers many sensitive requests in a row (limits only apply outside NODE_ENV=test)', async () => {
    const user = await createUser();
    for (let i = 0; i < 12; i += 1) {
      const res = await api
        .post(`${API}/auth/forgot-password`)
        .send({ email: user.email, captchaToken: VALID_CAPTCHA });
      expect(res.status).toBe(200);
    }
  });
});
