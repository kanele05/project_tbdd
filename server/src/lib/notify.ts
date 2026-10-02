import type { NotificationType, Prisma } from '@/generated/prisma/client';

/** `prisma` hoặc `tx` của `prisma.$transaction(async (tx) => ...)`. */
type NotificationDb = Pick<Prisma.TransactionClient, 'notification'>;

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Khớp `NotificationDto.data` (PLAN §9.3). */
  data?: { courseId?: string; questionId?: string } | null;
};

/**
 * Tạo thông báo cho người dùng (ORDER_PAID, NEW_ANSWER, COURSE_COMPLETED...). Truyền `tx` để thông báo
 * nằm trong CÙNG transaction với thao tác gây ra nó (rollback cùng nhau), hoặc `prisma` nếu độc lập.
 */
export function notify(db: NotificationDb, input: NotifyInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.data ? { data: input.data } : {}),
    },
    select: { id: true },
  });
}
