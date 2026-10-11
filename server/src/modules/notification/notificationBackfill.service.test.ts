import { backfillNotificationKeys } from './notificationBackfill.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findMany: jest.fn(), update: jest.fn((args: unknown) => args) },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

type Fn = jest.Mock;
const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { notification: Record<string, Fn>; $transaction: Fn };
};

const keyed = {
  id: 'n1',
  type: 'ORDER_PAID',
  title: 'Payment successful',
  body: 'You are now enrolled in A. Start learning today!',
  data: { courseId: 'c1', key: 'ORDER_PAID_ONE', params: { courseTitle: 'A' } },
};
const legacy = {
  id: 'n2',
  type: 'ORDER_PAID',
  title: 'Payment successful',
  body: 'You are now enrolled in 3 courses. Start learning today!',
  data: { courseId: 'c2' },
};
const free = {
  id: 'n3',
  type: 'SYSTEM',
  title: 'Welcome',
  body: 'Welcome to the platform, this body is quite long indeed.',
  data: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.notification.findMany.mockResolvedValueOnce([keyed, legacy, free]);
});

describe('backfillNotificationKeys', () => {
  it('dry run counts per key but writes nothing', async () => {
    const result = await backfillNotificationKeys(false);

    expect(result).toMatchObject({
      applied: false,
      scanned: 3,
      alreadyKeyed: 1,
      matched: 1,
      unmatched: 1,
      updated: 0,
      byKey: { ORDER_PAID_MANY: 1 },
      unmatchedByType: { SYSTEM: 1 },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('apply merges key and params into the existing data and leaves keyed / unmatched rows alone', async () => {
    const result = await backfillNotificationKeys(true);

    expect(result.updated).toBe(1);
    expect(prisma.notification.update).toHaveBeenCalledTimes(1);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n2' },
      data: { data: { courseId: 'c2', key: 'ORDER_PAID_MANY', params: { count: 3 } } },
      select: { id: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('never logs a full body: unmatched samples carry a short preview', async () => {
    const result = await backfillNotificationKeys(false);
    expect(result.unmatchedSamples).toEqual([
      { id: 'n3', type: 'SYSTEM', title: 'Welcome', bodyPreview: free.body.slice(0, 30) },
    ]);
  });

  it('pages through every batch', async () => {
    prisma.notification.findMany.mockReset();
    prisma.notification.findMany
      .mockResolvedValueOnce([legacy, free])
      .mockResolvedValueOnce([keyed]);

    const result = await backfillNotificationKeys(false, 2);

    expect(prisma.notification.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.notification.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: { id: 'n3' }, skip: 1 }),
    );
    expect(result.scanned).toBe(3);
  });
});
