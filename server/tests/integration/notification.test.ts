import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createNotification, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('/notifications', () => {
  it('lists mine newest first with meta.unreadCount and parsed data', async () => {
    const [user, other] = await Promise.all([createUser(), createUser()]);
    await createNotification(user.id, {
      title: 'Old',
      isRead: true,
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    await createNotification(user.id, {
      title: 'New',
      type: 'ORDER_PAID',
      createdAt: new Date('2026-09-03T00:00:00Z'),
      data: { courseId: 'crs_1' },
    });
    await createNotification(user.id, {
      title: 'Mid',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await createNotification(other.id, { title: 'Not mine' });

    const res = await api.get(`${API}/notifications`).query({ limit: 2 }).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2, unreadCount: 2 });
    expect(res.body.data).toEqual([
      expect.objectContaining({
        title: 'New',
        type: 'ORDER_PAID',
        isRead: false,
        data: { courseId: 'crs_1' },
        createdAt: '2026-09-03T00:00:00.000Z',
      }),
      expect.objectContaining({ title: 'Mid', data: null }),
    ]);
  });

  it('returns the unread count for the badge', async () => {
    const user = await createUser();
    await createNotification(user.id);
    await createNotification(user.id);
    await createNotification(user.id, { isRead: true });

    const res = await api.get(`${API}/notifications/unread-count`).set(authHeader(user));

    expect(res.body.data).toEqual({ count: 2 });
  });

  it('marks one notification as read (204) and decrements the count', async () => {
    const user = await createUser();
    const n = await createNotification(user.id);

    const res = await api.patch(`${API}/notifications/${n.id}/read`).set(authHeader(user));

    expect(res.status).toBe(204);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(
      true,
    );
  });

  it("returns 404 when marking another user's or a missing notification", async () => {
    const [user, other] = await Promise.all([createUser(), createUser()]);
    const theirs = await createNotification(other.id);

    const foreign = await api.patch(`${API}/notifications/${theirs.id}/read`).set(authHeader(user));
    const missing = await api.patch(`${API}/notifications/nope/read`).set(authHeader(user));

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: theirs.id } })).isRead).toBe(
      false,
    );
  });

  it('marks all of my notifications as read without touching others', async () => {
    const [user, other] = await Promise.all([createUser(), createUser()]);
    await createNotification(user.id);
    await createNotification(user.id);
    await createNotification(other.id);

    const res = await api.patch(`${API}/notifications/read-all`).set(authHeader(user));

    expect(res.status).toBe(204);
    expect(await prisma.notification.count({ where: { userId: user.id, isRead: false } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: other.id, isRead: false } })).toBe(1);
  });

  it('requires a token on every route', async () => {
    const results = await Promise.all([
      api.get(`${API}/notifications`),
      api.get(`${API}/notifications/unread-count`),
      api.patch(`${API}/notifications/read-all`),
      api.patch(`${API}/notifications/x/read`),
    ]);
    expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });
});
