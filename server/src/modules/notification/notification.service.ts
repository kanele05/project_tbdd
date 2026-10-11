import { ApiError } from '@/lib/ApiError';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { NotificationDto, NotificationType } from '@/types/dto';

/** Cột `data` là JSON tự do -> chỉ giữ `courseId` / `questionId` / `submissionId` / `reviewId` dạng chuỗi (PLAN §9.3, §2.4). */
export function parseNotificationData(value: unknown): NotificationDto['data'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const data: NonNullable<NotificationDto['data']> = {};
  if (typeof record.courseId === 'string') data.courseId = record.courseId;
  if (typeof record.questionId === 'string') data.questionId = record.questionId;
  if (typeof record.submissionId === 'string') data.submissionId = record.submissionId;
  if (typeof record.reviewId === 'string') data.reviewId = record.reviewId;
  return Object.keys(data).length > 0 ? data : null;
}

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
};

export function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: parseNotificationData(row.data),
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export type NotificationsPage = {
  notifications: NotificationDto[];
  meta: PaginationMeta & { unreadCount: number };
};

/** Mới nhất trước; `meta.unreadCount` có ở mọi trang (badge chuông + nút "Mark all as read"). */
export async function listNotifications(
  userId: string,
  query: { page?: number; limit?: number },
): Promise<NotificationsPage> {
  const pagination = getPagination(query);
  const [total, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    notifications: rows.map(toNotificationDto),
    meta: { ...buildPaginationMeta(total, pagination), unreadCount },
  };
}

export async function getUnreadCount(userId: string): Promise<{ count: number }> {
  return { count: await prisma.notification.count({ where: { userId, isRead: false } }) };
}

/** Chỉ đánh dấu thông báo CỦA MÌNH; của người khác hoặc không tồn tại -> 404 (không lộ sự tồn tại). */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  if (result.count === 0) throw ApiError.notFound('NOT_FOUND', 'Notification not found');
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
