import { prisma } from '@/lib/prisma';
import { backfillNotificationKeys } from '@/modules/notification/notificationBackfill.service';

import { createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';

beforeEach(async () => {
  await resetDb();
});

async function seedOldNotifications(userId: string) {
  await prisma.notification.createMany({
    data: [
      {
        id: 'old_paid',
        userId,
        type: 'ORDER_PAID',
        title: 'Payment successful',
        body: 'You are now enrolled in UX Foundation. Start learning today!',
        data: { courseId: 'c1' },
      },
      {
        id: 'old_device_vi',
        userId,
        type: 'SYSTEM',
        title: 'Đăng nhập từ thiết bị mới',
        body: 'Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: Pixel 8. Nếu không phải bạn, hãy đổi mật khẩu.',
      },
      {
        id: 'old_free_text',
        userId,
        type: 'SYSTEM',
        title: 'Welcome',
        body: 'Hand-written message',
      },
      {
        id: 'new_keyed',
        userId,
        type: 'REVIEW_REPLY',
        title: 'The instructor replied to your review',
        body: 'The instructor of "UX" replied to your review.',
        data: { courseId: 'c1', key: 'REVIEW_REPLY', params: { courseTitle: 'UX' } },
      },
    ],
  });
}

describe('backfillNotificationKeys', () => {
  it('dry run reports counts and leaves the table untouched', async () => {
    const user = await createUser();
    await seedOldNotifications(user.id);

    const result = await backfillNotificationKeys(false);

    expect(result).toMatchObject({
      applied: false,
      scanned: 4,
      alreadyKeyed: 1,
      matched: 2,
      unmatched: 1,
      updated: 0,
      byKey: { ORDER_PAID_ONE: 1, NEW_DEVICE: 1 },
    });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id: 'old_paid' } });
    expect(row.data).toEqual({ courseId: 'c1' });
  });

  it('apply stores key + params (keeping the ids), skips unmatched rows and is idempotent', async () => {
    const user = await createUser();
    await seedOldNotifications(user.id);

    const first = await backfillNotificationKeys(true);
    expect(first.updated).toBe(2);

    const paid = await prisma.notification.findUniqueOrThrow({ where: { id: 'old_paid' } });
    expect(paid.data).toEqual({
      courseId: 'c1',
      key: 'ORDER_PAID_ONE',
      params: { courseTitle: 'UX Foundation' },
    });
    const device = await prisma.notification.findUniqueOrThrow({ where: { id: 'old_device_vi' } });
    expect(device.data).toEqual({ key: 'NEW_DEVICE', params: { device: 'Pixel 8' } });
    const free = await prisma.notification.findUniqueOrThrow({ where: { id: 'old_free_text' } });
    expect(free.data).toBeNull();

    const second = await backfillNotificationKeys(true, 2);
    expect(second).toMatchObject({
      scanned: 4,
      alreadyKeyed: 3,
      matched: 0,
      updated: 0,
      unmatched: 1,
    });
  });
});
