import { router } from 'expo-router';
import { useCallback } from 'react';

import type { NotificationDto } from '@/types/api';

import { useMarkRead } from './hooks';
import { getNotificationHref } from './notificationMeta';

/**
 * Tapping a notification (phone and PC): marks it read (optimistic - the bell badge drops at once)
 * and opens its target when it has one. The returned callback is stable.
 */
export function useOpenNotification(): (notification: NotificationDto) => void {
  const { mutate: markRead } = useMarkRead();
  return useCallback(
    (notification) => {
      if (!notification.isRead) markRead(notification.id);
      const href = getNotificationHref(notification.data, notification.type);
      if (href) router.push(href);
    },
    [markRead],
  );
}
