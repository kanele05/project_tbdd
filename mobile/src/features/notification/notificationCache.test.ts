import type { NotificationDto } from '@/types/api';

import { markAllReadInList, markReadInList, type NotificationsData } from './notificationCache';

function item(id: string, isRead: boolean): NotificationDto {
  return {
    id,
    type: 'SYSTEM',
    title: `title ${id}`,
    body: 'body',
    data: null,
    isRead,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

function makeData(): NotificationsData {
  const meta = { limit: 20, total: 3, totalPages: 2, unreadCount: 2 };
  return {
    pageParams: [1, 2],
    pages: [
      { data: [item('a', false), item('b', true)], meta: { ...meta, page: 1 } },
      { data: [item('c', false)], meta: { ...meta, page: 2 } },
    ],
  };
}

describe('markReadInList', () => {
  it('flips the item and decrements unreadCount on every page', () => {
    const { data, wasUnread } = markReadInList(makeData(), 'c');

    expect(wasUnread).toBe(true);
    expect(data?.pages[1]?.data[0]?.isRead).toBe(true);
    expect(data?.pages[0]?.data[0]?.isRead).toBe(false);
    expect(data?.pages.map((page) => page.meta.unreadCount)).toEqual([1, 1]);
  });

  it('changes nothing for an already-read or unknown notification', () => {
    const original = makeData();

    expect(markReadInList(original, 'b')).toEqual({ data: original, wasUnread: false });
    expect(markReadInList(original, 'zzz').wasUnread).toBe(false);
    expect(markReadInList(undefined, 'a')).toEqual({ data: undefined, wasUnread: false });
  });
});

describe('markAllReadInList', () => {
  it('marks every item read and zeroes unreadCount', () => {
    const data = markAllReadInList(makeData());

    expect(data?.pages.flatMap((page) => page.data).every((n) => n.isRead)).toBe(true);
    expect(data?.pages.map((page) => page.meta.unreadCount)).toEqual([0, 0]);
  });

  it('passes undefined through', () => {
    expect(markAllReadInList(undefined)).toBeUndefined();
  });
});
