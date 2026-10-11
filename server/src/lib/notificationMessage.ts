import type { NotificationType } from '@/generated/prisma/client';
import type { Lang } from '@/lib/lang';
import { newDeviceNotification } from '@/lib/mailTemplates';
import type { NotificationMessageKey, NotificationMessageParams } from '@/types/dto';

/**
 * Nguồn DUY NHẤT của mọi thông báo trong app: mỗi thông báo có `key` ổn định + `params`. `title`/`body`
 * lưu kèm chỉ là bản dự phòng (tiếng Anh; riêng NEW_DEVICE theo ngôn ngữ lúc đăng nhập) - mobile hiển thị
 * theo ngôn ngữ đang chọn bằng `key` + `params` (i18n `notification:messages.<key>`). Script backfill dùng
 * lại đúng các hàm `render` này để suy ngược `params` từ thông báo cũ nên mẫu câu không thể lệch nhau.
 */
export type NotificationParamsMap = {
  NEW_DEVICE: { device: string };
  ORDER_PAID_ONE: { courseTitle: string };
  ORDER_PAID_MANY: { count: number };
  NEW_ANSWER: { author: string; courseTitle: string };
  COURSE_COMPLETED: { courseTitle: string };
  COURSE_APPROVED: { courseTitle: string };
  REVISION_APPROVED: { courseTitle: string };
  COURSE_REJECTED: { courseTitle: string; reason: string };
  REVISION_REJECTED: { courseTitle: string; reason: string };
  NEW_COURSE: { teacher: string; courseTitle: string };
  PROJECT_GRADED: { projectTitle: string; courseTitle: string; grade: number };
  REVIEW_REPLY: { courseTitle: string };
};

type Text = { title: string; body: string };

type MessageDef<K extends NotificationMessageKey> = {
  type: NotificationType;
  render: (params: NotificationParamsMap[K], lang: Lang) => Text;
};

export const NOTIFICATION_MESSAGES: { [K in NotificationMessageKey]: MessageDef<K> } = {
  NEW_DEVICE: {
    type: 'SYSTEM',
    render: (p, lang) => newDeviceNotification(lang, p.device),
  },
  ORDER_PAID_ONE: {
    type: 'ORDER_PAID',
    render: (p) => ({
      title: 'Payment successful',
      body: `You are now enrolled in ${p.courseTitle}. Start learning today!`,
    }),
  },
  ORDER_PAID_MANY: {
    type: 'ORDER_PAID',
    render: (p) => ({
      title: 'Payment successful',
      body: `You are now enrolled in ${p.count} courses. Start learning today!`,
    }),
  },
  NEW_ANSWER: {
    type: 'NEW_ANSWER',
    render: (p) => ({
      title: 'New answer to your question',
      body: `${p.author} answered your question in "${p.courseTitle}".`,
    }),
  },
  COURSE_COMPLETED: {
    type: 'COURSE_COMPLETED',
    render: (p) => ({
      title: 'Course completed',
      body: `Congratulations! You completed "${p.courseTitle}".`,
    }),
  },
  COURSE_APPROVED: {
    type: 'COURSE_APPROVED',
    render: (p) => ({
      title: 'Your course was approved',
      body: `"${p.courseTitle}" has been approved and is now published.`,
    }),
  },
  REVISION_APPROVED: {
    type: 'COURSE_APPROVED',
    render: (p) => ({
      title: 'Your course changes were approved',
      body: `The changes you submitted for "${p.courseTitle}" are now live.`,
    }),
  },
  COURSE_REJECTED: {
    type: 'COURSE_REJECTED',
    render: (p) => ({
      title: 'Your course was not approved',
      body: `"${p.courseTitle}": ${p.reason}`,
    }),
  },
  REVISION_REJECTED: {
    type: 'COURSE_REJECTED',
    render: (p) => ({
      title: 'Your course changes were not approved',
      body: `"${p.courseTitle}": ${p.reason}`,
    }),
  },
  NEW_COURSE: {
    type: 'NEW_COURSE',
    render: (p) => ({
      title: 'New course from an instructor you follow',
      body: `${p.teacher} published "${p.courseTitle}".`,
    }),
  },
  PROJECT_GRADED: {
    type: 'PROJECT_GRADED',
    render: (p) => ({
      title: 'Your project was graded',
      body: `Your project "${p.projectTitle}" in "${p.courseTitle}" received ${p.grade}/100.`,
    }),
  },
  REVIEW_REPLY: {
    type: 'REVIEW_REPLY',
    render: (p) => ({
      title: 'The instructor replied to your review',
      body: `The instructor of "${p.courseTitle}" replied to your review.`,
    }),
  },
};

export type NotificationMessage<K extends NotificationMessageKey = NotificationMessageKey> = {
  type: NotificationType;
  title: string;
  body: string;
  /** `{ key, params }` - lưu vào `Notification.data` cùng các id điều hướng. */
  data: { key: K; params: NotificationMessageParams };
};

/**
 * Dựng thông báo từ `key` + `params` (kiểu `params` khớp theo `key`, nên nơi gọi không thể sai tham số).
 * `lang` chỉ ảnh hưởng bản dự phòng của NEW_DEVICE; mọi loại khác lưu tiếng Anh.
 */
export function notificationMessage<K extends NotificationMessageKey>(
  key: K,
  params: NotificationParamsMap[K],
  lang: Lang = 'en',
): NotificationMessage<K> {
  const def: MessageDef<K> = NOTIFICATION_MESSAGES[key];
  const { title, body } = def.render(params, lang);
  return { type: def.type, title, body, data: { key, params } };
}

const KEYS = new Set<string>(Object.keys(NOTIFICATION_MESSAGES));

export function isNotificationMessageKey(value: unknown): value is NotificationMessageKey {
  return typeof value === 'string' && KEYS.has(value);
}
