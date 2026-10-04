import jwt from 'jsonwebtoken';

import { env } from '@/config/env';
import { hashRefreshToken } from '@/lib/authCrypto';
import { prisma } from '@/lib/prisma';

import { bearer, createUserAndLogin, loginViaApi } from '../helpers/authFlow';
import { mockTurnstile, restoreTurnstile } from '../helpers/captcha';
import { createUser } from '../helpers/factories';
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

const refresh = (refreshToken: string) => api.post(`${API}/auth/refresh`).send({ refreshToken });

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and returns a working access token + user', async () => {
    const { user, session } = await createUserAndLogin(api);

    const res = await refresh(session.refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      twoFactorRequired: false,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresIn: 900,
      user: { id: user.id },
    });
    expect(res.body.data.token).toBe(res.body.data.accessToken);
    expect(res.body.data.refreshToken).not.toBe(session.refreshToken);

    // Cùng một phiên (sid không đổi), access token mới dùng được.
    const oldSid = (jwt.decode(session.accessToken) as { sid: string }).sid;
    const newSid = (jwt.decode(res.body.data.accessToken) as { sid: string }).sid;
    expect(newSid).toBe(oldSid);
    await api.get(`${API}/auth/me`).set(bearer(res.body.data.accessToken)).expect(200);

    // DB: token cũ đã đánh dấu usedAt, token mới chỉ lưu hash, hạn trượt 30 ngày.
    const rows = await prisma.refreshToken.findMany({
      where: { sessionId: oldSid },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.usedAt).toBeInstanceOf(Date);
    expect(rows[1]?.usedAt).toBeNull();
    expect(rows[1]?.tokenHash).toBe(hashRefreshToken(res.body.data.refreshToken));
    const days = ((rows[1]?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('can be chained: each new refresh token works exactly once', async () => {
    const { session } = await createUserAndLogin(api);
    const first = await refresh(session.refreshToken).expect(200);
    const second = await refresh(first.body.data.refreshToken).expect(200);
    await refresh(second.body.data.refreshToken).expect(200);
  });

  it('detects reuse of an old token: 401, and the WHOLE session (newest token + access token) is revoked', async () => {
    const { user, session } = await createUserAndLogin(api);
    const rotated = await refresh(session.refreshToken).expect(200);
    const sid = (jwt.decode(session.accessToken) as { sid: string }).sid;

    // kẻ trộm / bản sao cũ trình lại token đã dùng
    const reuse = await refresh(session.refreshToken);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    // người dùng thật cũng bị đăng xuất: token mới nhất và access token đều chết
    const newest = await refresh(rotated.body.data.refreshToken);
    expect(newest.status).toBe(401);
    expect(newest.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    await api.get(`${API}/auth/me`).set(bearer(rotated.body.data.accessToken)).expect(401);
    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);

    const stored = await prisma.session.findUniqueOrThrow({ where: { id: sid } });
    expect(stored.revokedAt).toBeInstanceOf(Date);
    expect(stored.revokedReason).toBe('REFRESH_REUSE');
    expect(await prisma.refreshToken.count({ where: { sessionId: sid } })).toBe(0);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'REFRESH_REUSE' } }),
    ).toBe(1);
  });

  it('only revokes the compromised session, not the other devices of the user', async () => {
    const user = await createUser({ session: false });
    const phone = (await loginViaApi(api, user.email, user.password, { deviceName: 'Phone' })).body
      .data;
    const laptop = (await loginViaApi(api, user.email, user.password, { deviceName: 'Laptop' }))
      .body.data;
    await refresh(phone.refreshToken).expect(200);
    await refresh(phone.refreshToken).expect(401); // reuse trên điện thoại

    await api.get(`${API}/auth/me`).set(bearer(laptop.accessToken)).expect(200);
    await refresh(laptop.refreshToken).expect(200);
  });

  it('answers a concurrent double refresh with one success and one revoked session', async () => {
    const { session } = await createUserAndLogin(api);
    const [a, b] = await Promise.all([
      refresh(session.refreshToken),
      refresh(session.refreshToken),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 401]);
    const winner = a.status === 200 ? a : b;
    // Phiên đã bị thu hồi vì phát hiện dùng lại -> ngay cả token thắng cũng không còn dùng được.
    await refresh(winner.body.data.refreshToken).expect(401);
  });

  it.each([
    ['a random token', 'a'.repeat(43)],
    ['a too short token', 'short'],
  ])('rejects %s', async (_label, token) => {
    const res = await refresh(token);
    expect([400, 401]).toContain(res.status);
    expect(res.body.error.code).toMatch(/^(INVALID_REFRESH_TOKEN|VALIDATION_ERROR)$/);
  });

  it('rejects an expired refresh token', async () => {
    const { session } = await createUserAndLogin(api);
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await refresh(session.refreshToken);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('requires the refreshToken field (400 VALIDATION_ERROR)', async () => {
    const res = await api.post(`${API}/auth/refresh`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects the refresh token of a session that was logged out', async () => {
    const { session } = await createUserAndLogin(api);
    await api.post(`${API}/auth/logout`).set(bearer(session.accessToken)).expect(204);
    await refresh(session.refreshToken).expect(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the current session: the access token and the refresh token stop working', async () => {
    const { user, session } = await createUserAndLogin(api);
    await api.get(`${API}/me/stats`).set(bearer(session.accessToken)).expect(200);

    const res = await api.post(`${API}/auth/logout`).set(bearer(session.accessToken));
    expect(res.status).toBe(204);

    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
    await api.get(`${API}/me/stats`).set(bearer(session.accessToken)).expect(401);
    await refresh(session.refreshToken).expect(401);
    expect(await prisma.authEvent.count({ where: { userId: user.id, type: 'LOGOUT' } })).toBe(1);
  });

  it('works with only the refresh token (the access token already expired)', async () => {
    const { session } = await createUserAndLogin(api);
    const res = await api.post(`${API}/auth/logout`).send({ refreshToken: session.refreshToken });
    expect(res.status).toBe(204);
    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
    await refresh(session.refreshToken).expect(401);
  });

  it('only ends the current device, not the others', async () => {
    const user = await createUser({ session: false });
    const phone = (await loginViaApi(api, user.email, user.password, { deviceName: 'Phone' })).body
      .data;
    const laptop = (await loginViaApi(api, user.email, user.password, { deviceName: 'Laptop' }))
      .body.data;
    await api.post(`${API}/auth/logout`).set(bearer(phone.accessToken)).expect(204);
    await api.get(`${API}/auth/me`).set(bearer(laptop.accessToken)).expect(200);
  });

  it('is idempotent and never leaks information (always 204)', async () => {
    const { session } = await createUserAndLogin(api);
    await api.post(`${API}/auth/logout`).set(bearer(session.accessToken)).expect(204);
    await api.post(`${API}/auth/logout`).set(bearer(session.accessToken)).expect(204);
    await api.post(`${API}/auth/logout`).expect(204);
    await api
      .post(`${API}/auth/logout`)
      .send({ refreshToken: 'x'.repeat(43) })
      .expect(204);
    await api.post(`${API}/auth/logout`).set('Authorization', 'Bearer garbage').expect(204);
  });
});

describe('access token ↔ session binding', () => {
  it('rejects the access token of a revoked session on every protected endpoint immediately', async () => {
    const { session } = await createUserAndLogin(api);
    const sid = (jwt.decode(session.accessToken) as { sid: string }).sid;
    await prisma.session.update({ where: { id: sid }, data: { revokedAt: new Date() } });

    for (const path of ['/auth/me', '/me/stats', '/me/sessions', '/cart', '/notifications']) {
      const res = await api.get(`${API}${path}`).set(bearer(session.accessToken));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('also protects optional-auth endpoints: a revoked token is a 401, not a silent guest', async () => {
    const { session } = await createUserAndLogin(api);
    await api.post(`${API}/auth/logout`).set(bearer(session.accessToken)).expect(204);
    await api.get(`${API}/home`).set(bearer(session.accessToken)).expect(401);
    await api.get(`${API}/home`).expect(200);
  });

  it('rejects a token whose session has expired', async () => {
    const { session } = await createUserAndLogin(api);
    const sid = (jwt.decode(session.accessToken) as { sid: string }).sid;
    await prisma.session.update({
      where: { id: sid },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
  });

  it('does not accept a challengeToken as a bearer token', async () => {
    const user = await createUser();
    const challenge = jwt.sign({ typ: '2fa-challenge' }, env.JWT_SECRET, { subject: user.id });
    await api.get(`${API}/auth/me`).set(bearer(challenge)).expect(401);
  });
});

describe('GET /me/sessions', () => {
  it('lists the devices with the current one flagged, most recently used first', async () => {
    const user = await createUser({ session: false });
    const phone = (await loginViaApi(api, user.email, user.password, { deviceName: 'Pixel 8' }))
      .body.data;
    const laptop = (
      await loginViaApi(api, user.email, user.password, { deviceName: 'Chrome on Windows' })
    ).body.data;

    const res = await api.get(`${API}/me/sessions`).set(bearer(phone.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({
      id: expect.any(String),
      deviceName: 'Chrome on Windows',
      ipAddress: '127.0.0.x',
      createdAt: expect.any(String),
      lastUsedAt: expect.any(String),
      isCurrent: false,
    });
    expect(res.body.data[1]).toMatchObject({ deviceName: 'Pixel 8', isCurrent: true });
    expect(JSON.stringify(res.body)).not.toContain('refresh');

    const asLaptop = await api.get(`${API}/me/sessions`).set(bearer(laptop.accessToken));
    expect(asLaptop.body.data.find((s: { isCurrent: boolean }) => s.isCurrent).deviceName).toBe(
      'Chrome on Windows',
    );
  });

  it('hides revoked and expired sessions and never shows other users sessions', async () => {
    const { user, session } = await createUserAndLogin(api);
    await createUserAndLogin(api, { deviceName: 'Someone else' });
    const ghost = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName: 'Old phone',
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const res = await api.get(`${API}/me/sessions`).set(bearer(session.accessToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data.map((s: { id: string }) => s.id)).not.toContain(ghost.id);
  });

  it('requires authentication', async () => {
    await api.get(`${API}/me/sessions`).expect(401);
  });
});

describe('DELETE /me/sessions/:id (remote logout)', () => {
  it('signs another device out: its tokens stop working, this device keeps working', async () => {
    const user = await createUser({ session: false });
    const phone = (await loginViaApi(api, user.email, user.password, { deviceName: 'Phone' })).body
      .data;
    const laptop = (await loginViaApi(api, user.email, user.password, { deviceName: 'Laptop' }))
      .body.data;
    const laptopSid = (jwt.decode(laptop.accessToken) as { sid: string }).sid;

    const res = await api.delete(`${API}/me/sessions/${laptopSid}`).set(bearer(phone.accessToken));
    expect(res.status).toBe(204);

    await api.get(`${API}/auth/me`).set(bearer(laptop.accessToken)).expect(401);
    await refresh(laptop.refreshToken).expect(401);
    await api.get(`${API}/auth/me`).set(bearer(phone.accessToken)).expect(200);
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'SESSION_REVOKED' } }),
    ).toBe(1);

    const list = await api.get(`${API}/me/sessions`).set(bearer(phone.accessToken));
    expect(list.body.data).toHaveLength(1);
  });

  it('can end the current session too', async () => {
    const { session } = await createUserAndLogin(api);
    const sid = (jwt.decode(session.accessToken) as { sid: string }).sid;
    await api.delete(`${API}/me/sessions/${sid}`).set(bearer(session.accessToken)).expect(204);
    await api.get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
  });

  it('returns 404 SESSION_NOT_FOUND for another user session, a missing one and an already revoked one', async () => {
    const a = await createUserAndLogin(api);
    const b = await createUserAndLogin(api);
    const bSid = (jwt.decode(b.session.accessToken) as { sid: string }).sid;

    const foreign = await api
      .delete(`${API}/me/sessions/${bSid}`)
      .set(bearer(a.session.accessToken));
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe('SESSION_NOT_FOUND');
    await api.get(`${API}/auth/me`).set(bearer(b.session.accessToken)).expect(200); // không bị ảnh hưởng

    await api.delete(`${API}/me/sessions/nope`).set(bearer(a.session.accessToken)).expect(404);

    // phiên đã thu hồi cũng là 404 (thu hồi lần hai)
    const second = (await loginViaApi(api, a.user.email, a.user.password, { deviceName: 'Tablet' }))
      .body.data;
    const secondSid = (jwt.decode(second.accessToken) as { sid: string }).sid;
    await api
      .delete(`${API}/me/sessions/${secondSid}`)
      .set(bearer(a.session.accessToken))
      .expect(204);
    await api
      .delete(`${API}/me/sessions/${secondSid}`)
      .set(bearer(a.session.accessToken))
      .expect(404);
  });

  it('requires authentication', async () => {
    await api.delete(`${API}/me/sessions/abc`).expect(401);
  });
});

describe('DELETE /me/sessions (sign out all other devices)', () => {
  it('revokes every other session, keeps the current one and returns the count', async () => {
    const user = await createUser({ session: false });
    const a = (await loginViaApi(api, user.email, user.password, { deviceName: 'A' })).body.data;
    const b = (await loginViaApi(api, user.email, user.password, { deviceName: 'B' })).body.data;
    const c = (await loginViaApi(api, user.email, user.password, { deviceName: 'C' })).body.data;

    const res = await api.delete(`${API}/me/sessions`).set(bearer(b.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ revokedCount: 2 });
    await api.get(`${API}/auth/me`).set(bearer(a.accessToken)).expect(401);
    await api.get(`${API}/auth/me`).set(bearer(c.accessToken)).expect(401);
    await api.get(`${API}/auth/me`).set(bearer(b.accessToken)).expect(200);
  });

  it('returns 0 when there is no other device', async () => {
    const { session } = await createUserAndLogin(api);
    const res = await api.delete(`${API}/me/sessions`).set(bearer(session.accessToken));
    expect(res.body.data).toEqual({ revokedCount: 0 });
  });
});

describe('new device alert (AUTH-06)', () => {
  it('does not alert on the very first login of an account', async () => {
    const { user } = await createUserAndLogin(api, { deviceName: 'Pixel 8' });
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(mailbox.to(user.email)).toHaveLength(0);
  });

  it('alerts with an in-app notification, an email and an event when a NEW device signs in', async () => {
    const user = await createUser({ session: false });
    await loginViaApi(api, user.email, user.password, { deviceName: 'Pixel 8' }).expect(200);
    expect(mailbox.to(user.email)).toHaveLength(0);

    const second = await loginViaApi(api, user.email, user.password, {
      deviceName: 'Chrome on Windows',
    });
    expect(second.status).toBe(200);

    const notifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'SYSTEM',
      title: 'New device sign-in',
      isRead: false,
    });
    expect(notifications[0]?.body).toContain('Chrome on Windows');

    const mail = mailbox.lastTo(user.email);
    expect(mail.subject).toBe('New sign-in to your E-Learning account');
    expect(mail.text).toContain('Chrome on Windows');
    expect(mail.text).toContain('127.0.0.x');
    expect(
      await prisma.authEvent.count({ where: { userId: user.id, type: 'NEW_DEVICE_LOGIN' } }),
    ).toBe(1);

    // thấy thông báo qua API thông báo của app
    const list = await api.get(`${API}/notifications`).set(bearer(second.body.data.accessToken));
    expect(list.body.data[0]).toMatchObject({ title: 'New device sign-in' });
  });

  it('does not alert again for a device that was used before', async () => {
    const user = await createUser({ session: false });
    await loginViaApi(api, user.email, user.password, { deviceName: 'Pixel 8' }).expect(200);
    await loginViaApi(api, user.email, user.password, { deviceName: 'pixel 8' }).expect(200);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(mailbox.to(user.email)).toHaveLength(0);
  });

  it('writes the alert in Vietnamese for Accept-Language: vi', async () => {
    const user = await createUser({ session: false });
    await loginViaApi(api, user.email, user.password, { deviceName: 'Pixel 8' }).expect(200);
    await api
      .post(`${API}/auth/login`)
      .set('Accept-Language', 'vi')
      .send({ email: user.email, password: user.password, deviceName: 'Laptop' })
      .expect(200);
    expect(mailbox.lastTo(user.email).subject).toBe('Đăng nhập mới vào tài khoản E-Learning');
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: user.id } });
    expect(note.title).toBe('Đăng nhập từ thiết bị mới');
  });
});

describe('GET /me/security', () => {
  it('reports the verification and 2FA state', async () => {
    const { session } = await createUserAndLogin(api);
    const res = await api.get(`${API}/me/security`).set(bearer(session.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      emailVerified: true,
      twoFactorEnabled: false,
      recoveryCodesRemaining: 0,
    });
  });

  it('requires authentication', async () => {
    await api.get(`${API}/me/security`).expect(401);
  });
});
