import type { NotificationDto } from '@/types/api';

import { groupNotificationsByDay } from './notificationGroups';

const NOW = new Date(2026, 9, 11, 15, 0, 0);

function notification(id: string, createdAt: Date): NotificationDto {
  return {
    id,
    type: 'SYSTEM',
    title: id,
    body: '',
    data: null,
    isRead: false,
    createdAt: createdAt.toISOString(),
  };
}

describe('groupNotificationsByDay', () => {
  it('splits into today, yesterday and earlier and keeps the order', () => {
    const groups = groupNotificationsByDay(
      [
        notification('a', new Date(2026, 9, 11, 9, 0)),
        notification('b', new Date(2026, 9, 11, 1, 0)),
        notification('c', new Date(2026, 9, 10, 23, 30)),
        notification('d', new Date(2026, 9, 3, 12, 0)),
      ],
      NOW,
    );

    expect(groups.map((group) => group.key)).toEqual(['today', 'yesterday', 'earlier']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['c']);
    expect(groups[2]?.items.map((item) => item.id)).toEqual(['d']);
  });

  it('leaves out the empty groups', () => {
    const groups = groupNotificationsByDay([notification('x', new Date(2026, 8, 1))], NOW);
    expect(groups.map((group) => group.key)).toEqual(['earlier']);
  });

  it('puts an invalid date under earlier', () => {
    const broken = { ...notification('x', NOW), createdAt: 'not a date' };
    expect(groupNotificationsByDay([broken], NOW)[0]?.key).toBe('earlier');
  });

  it('returns nothing for an empty list', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });
});
