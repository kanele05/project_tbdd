import { api } from '@/lib/apiClient';
import type { NotificationDto, NotificationsPage, UnreadCountResponse } from '@/types/api';

type PageParams = { page?: number; limit?: number };

/** HTTP layer of the notification feature (PLAN.md §9.2). */
export const notificationApi = {
  /** `GET /notifications` - newest first, `meta.unreadCount` on every page. */
  list: (params: PageParams = {}): Promise<NotificationsPage> =>
    api.getPage<NotificationDto, { unreadCount: number }>('/notifications', params),

  /** `GET /notifications/unread-count` -> `{ count }` (badge of the Home bell). */
  unreadCount: () => api.get<UnreadCountResponse>('/notifications/unread-count'),

  /** `PATCH /notifications/:id/read` -> 204. */
  markRead: (notificationId: string) => api.patch(`/notifications/${notificationId}/read`),

  /** `PATCH /notifications/read-all` -> 204. */
  markAllRead: () => api.patch('/notifications/read-all'),
};
