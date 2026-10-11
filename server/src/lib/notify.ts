import type { Prisma } from '@/generated/prisma/client';
import type { NotificationMessage } from '@/lib/notificationMessage';
import type { NotificationDataDto } from '@/types/dto';

/** `prisma` hoặc `tx` của `prisma.$transaction(async (tx) => ...)`. */
type NotificationDb = Pick<Prisma.TransactionClient, 'notification'>;

/** Các id để mobile mở đúng màn khi chạm thông báo (phần còn lại của `data` là `key` + `params`). */
export type NotificationRefs = Omit<NotificationDataDto, 'key' | 'params'>;

export type NotifyInput = {
  userId: string;
  /** Dựng bằng `notificationMessage(key, params)` - luôn kèm `data.key` + `data.params`. */
  message: NotificationMessage;
  refs?: NotificationRefs;
};

/** `data` lưu trong DB / `createMany`: id điều hướng + `key` + `params` của câu thông báo. */
export function notificationData(
  message: NotificationMessage,
  refs: NotificationRefs = {},
): Prisma.InputJsonObject {
  return { ...refs, key: message.data.key, params: message.data.params };
}

/**
 * Tạo thông báo cho người dùng (ORDER_PAID, NEW_ANSWER, COURSE_COMPLETED, COURSE_APPROVED, COURSE_REJECTED, NEW_COURSE, PROJECT_GRADED, REVIEW_REPLY...). Truyền `tx` để thông báo
 * nằm trong CÙNG transaction với thao tác gây ra nó (rollback cùng nhau), hoặc `prisma` nếu độc lập.
 * `title`/`body` lưu bản dự phòng; mobile dịch theo `data.key` + `data.params`.
 */
export function notify(db: NotificationDb, input: NotifyInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.message.type,
      title: input.message.title,
      body: input.message.body,
      data: notificationData(input.message, input.refs),
    },
    select: { id: true },
  });
}
