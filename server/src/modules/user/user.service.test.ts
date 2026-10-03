import { getMyStats, updateAvatar, updateMe } from './user.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    bookmark: { count: jest.fn() },
    enrollment: { count: jest.fn() },
    user: { update: jest.fn() },
  },
  Prisma: jest.requireActual('@/generated/prisma/client').Prisma,
}));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: Record<string, Record<string, Fn>> })
  .prisma;
const { Prisma } = jest.requireActual('@/generated/prisma/client');

const userRow = {
  id: 'u1',
  email: 'u@example.com',
  fullName: 'New Name',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
};

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
});

describe('getMyStats (BR-15)', () => {
  it('counts bookmarks, ongoing (< 100 %) and completed (= 100 %) enrollments', async () => {
    db.bookmark.count.mockResolvedValue(4);
    db.enrollment.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    await expect(getMyStats('u1')).resolves.toEqual({
      savedCount: 4,
      ongoingCount: 3,
      completedCount: 1,
    });
    expect(db.enrollment.count).toHaveBeenNthCalledWith(1, {
      where: { userId: 'u1', progressPercent: { lt: 100 } },
    });
    expect(db.enrollment.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 'u1', progressPercent: 100 },
    });
  });
});

describe('updateMe', () => {
  it('updates only the provided fields and never exposes passwordHash', async () => {
    db.user.update.mockResolvedValue(userRow);

    const user = await updateMe('u1', { fullName: 'New Name' });

    expect(db.user.update.mock.calls[0][0].data).toEqual({ fullName: 'New Name' });
    expect(user).toEqual(userRow);
  });

  it('stores an empty or null headline as NULL', async () => {
    db.user.update.mockResolvedValue(userRow);
    await updateMe('u1', { headline: '' });
    await updateMe('u1', { headline: null });
    expect(db.user.update.mock.calls[0][0].data).toEqual({ headline: null });
    expect(db.user.update.mock.calls[1][0].data).toEqual({ headline: null });
  });

  it('answers 401 when the account no longer exists (P2025)', async () => {
    db.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('gone', { code: 'P2025', clientVersion: 'x' }),
    );
    await expect(updateMe('u1', { fullName: 'Someone' })).rejects.toMatchObject({ status: 401 });
  });
});

describe('updateAvatar', () => {
  it('stores a relative /uploads path and returns an absolute URL', async () => {
    db.user.update.mockResolvedValue({ id: 'u1' });

    const result = await updateAvatar('u1', 'abc.png');

    expect(db.user.update.mock.calls[0][0].data).toEqual({ avatarUrl: '/uploads/abc.png' });
    expect(result.avatarUrl).toMatch(/^https?:\/\/.+\/uploads\/abc\.png$/);
  });
});

describe('user service (account and database errors)', () => {
  const missingAccount = () =>
    new Prisma.PrismaClientKnownRequestError('gone', { code: 'P2025', clientVersion: 'x' });

  it('updateAvatar answers 401 when the account no longer exists (P2025)', async () => {
    db.user.update.mockRejectedValue(missingAccount());
    await expect(updateAvatar('u1', 'abc.png')).rejects.toMatchObject({ status: 401 });
  });

  it('rethrows other database errors unchanged', async () => {
    const boom = new Error('connection lost');
    db.user.update.mockRejectedValue(boom);
    await expect(updateMe('u1', { fullName: 'Someone' })).rejects.toBe(boom);
    await expect(updateAvatar('u1', 'abc.png')).rejects.toBe(boom);
  });
});
