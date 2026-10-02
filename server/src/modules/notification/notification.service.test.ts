import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  parseNotificationData,
  toNotificationDto,
} from './notification.service';

jest.mock('@/lib/prisma', () => ({
  prisma: { notification: { count: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() } },
}));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: { notification: Record<string, Fn> } })
  .prisma.notification;

beforeEach(() => {
  for (const fn of Object.values(db)) fn.mockReset();
});

describe('parseNotificationData', () => {
  it('keeps only string courseId / questionId', () => {
    expect(parseNotificationData({ courseId: 'c', questionId: 'q', extra: 1 })).toEqual({
      courseId: 'c',
      questionId: 'q',
    });
    expect(parseNotificationData({ courseId: 5 })).toBeNull();
  });

  it('returns null for null, arrays and primitives', () => {
    for (const value of [null, undefined, [], 'x', 3, {}]) {
      expect(parseNotificationData(value)).toBeNull();
    }
  });
});

describe('toNotificationDto', () => {
  it('serializes dates as ISO strings', () => {
    expect(
      toNotificationDto({
        id: 'n1',
        type: 'SYSTEM',
        title: 'T',
        body: 'B',
        data: null,
        isRead: false,
        createdAt: new Date('2026-09-01T10:00:00Z'),
      }),
    ).toEqual({
      id: 'n1',
      type: 'SYSTEM',
      title: 'T',
      body: 'B',
      data: null,
      isRead: false,
      createdAt: '2026-09-01T10:00:00.000Z',
    });
  });
});

describe('listNotifications', () => {
  it('returns pagination meta extended with unreadCount, newest first', async () => {
    db.count.mockResolvedValueOnce(25).mockResolvedValueOnce(4);
    db.findMany.mockResolvedValue([]);

    const result = await listNotifications('u1', { page: 2, limit: 10 });

    expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3, unreadCount: 4 });
    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });
});

describe('getUnreadCount / markAsRead / markAllAsRead', () => {
  it('counts only unread notifications of the user', async () => {
    db.count.mockResolvedValue(3);
    await expect(getUnreadCount('u1')).resolves.toEqual({ count: 3 });
    expect(db.count).toHaveBeenCalledWith({ where: { userId: 'u1', isRead: false } });
  });

  it('scopes the update to the owner and throws 404 when nothing matched', async () => {
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(markAsRead('u1', 'n1')).rejects.toMatchObject({ status: 404 });
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u1' },
      data: { isRead: true },
    });
  });

  it('marks all unread notifications of the user', async () => {
    db.updateMany.mockResolvedValue({ count: 2 });
    await markAllAsRead('u1');
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
      data: { isRead: true },
    });
  });
});
