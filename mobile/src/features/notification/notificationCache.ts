import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import type { NotificationsPage, UnreadCountResponse } from '@/types/api';

export type NotificationsData = InfiniteData<NotificationsPage, number>;

/** Previous cache values captured before an optimistic write (for rollback). */
export type NotificationsSnapshot = {
  list: NotificationsData | undefined;
  count: UnreadCountResponse | undefined;
};

/** Mark one notification read. `wasUnread` is false when it is missing or already read. */
export function markReadInList(
  data: NotificationsData | undefined,
  notificationId: string,
): { data: NotificationsData | undefined; wasUnread: boolean } {
  const isUnread = data?.pages.some((page) =>
    page.data.some((item) => item.id === notificationId && !item.isRead),
  );
  if (!data || !isUnread) return { data, wasUnread: false };

  return {
    wasUnread: true,
    data: {
      ...data,
      pages: data.pages.map((page) => ({
        data: page.data.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
        meta: { ...page.meta, unreadCount: Math.max(0, page.meta.unreadCount - 1) },
      })),
    },
  };
}

/** Mark everything read and zero the unread counter carried by each page. */
export function markAllReadInList(
  data: NotificationsData | undefined,
): NotificationsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      data: page.data.map((item) => (item.isRead ? item : { ...item, isRead: true })),
      meta: { ...page.meta, unreadCount: 0 },
    })),
  };
}

/** Capture the list + badge caches (exact keys: the list key is a prefix of the badge key). */
export function takeSnapshot(queryClient: QueryClient): NotificationsSnapshot {
  return {
    list: queryClient.getQueryData<NotificationsData>(queryKeys.notifications()),
    count: queryClient.getQueryData<UnreadCountResponse>(queryKeys.notificationsUnreadCount()),
  };
}

/** Put back a snapshot; entries that were not cached stay untouched. */
export function restoreSnapshot(queryClient: QueryClient, snapshot: NotificationsSnapshot): void {
  if (snapshot.list) queryClient.setQueryData(queryKeys.notifications(), snapshot.list);
  if (snapshot.count) {
    queryClient.setQueryData(queryKeys.notificationsUnreadCount(), snapshot.count);
  }
}

/** Optimistic "read one": list item flipped, list meta and bell badge decremented. */
export function applyMarkRead(queryClient: QueryClient, notificationId: string): void {
  const { list } = takeSnapshot(queryClient);
  const result = markReadInList(list, notificationId);
  if (!result.wasUnread || !result.data) return;
  queryClient.setQueryData(queryKeys.notifications(), result.data);
  queryClient.setQueryData<UnreadCountResponse>(queryKeys.notificationsUnreadCount(), (old) =>
    old ? { count: Math.max(0, old.count - 1) } : old,
  );
}

/** Optimistic "read all": every item read, counters at zero. */
export function applyMarkAllRead(queryClient: QueryClient): void {
  const { list } = takeSnapshot(queryClient);
  const next = markAllReadInList(list);
  if (next) queryClient.setQueryData(queryKeys.notifications(), next);
  queryClient.setQueryData<UnreadCountResponse>(queryKeys.notificationsUnreadCount(), (old) =>
    old ? { count: 0 } : old,
  );
}
