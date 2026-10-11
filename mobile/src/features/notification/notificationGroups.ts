import dayjs from 'dayjs';

import type { NotificationDto } from '@/types/api';

export type NotificationGroupKey = 'today' | 'yesterday' | 'earlier';

export type NotificationGroup = {
  key: NotificationGroupKey;
  items: NotificationDto[];
};

function getGroupKey(createdAt: string, now: dayjs.Dayjs): NotificationGroupKey {
  const day = dayjs(createdAt);
  if (!day.isValid()) return 'earlier';
  if (day.isSame(now, 'day')) return 'today';
  if (day.isSame(now.subtract(1, 'day'), 'day')) return 'yesterday';
  return 'earlier';
}

/**
 * Splits the notifications (newest first) into Today / Yesterday / Earlier for the PC list. Order
 * inside a group is kept; empty groups are left out. `now` is injectable for tests.
 */
export function groupNotificationsByDay(
  items: readonly NotificationDto[],
  now: Date | number = Date.now(),
): NotificationGroup[] {
  const reference = dayjs(now);
  const groups: Record<NotificationGroupKey, NotificationDto[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const item of items) groups[getGroupKey(item.createdAt, reference)].push(item);
  const order: readonly NotificationGroupKey[] = ['today', 'yesterday', 'earlier'];
  return order.flatMap((key) => (groups[key].length > 0 ? [{ key, items: groups[key] }] : []));
}
