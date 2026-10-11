import type { FeatherIconName } from '@/components/ui/icons';
import { i18n } from '@/i18n';
import type { PaletteToken } from '@/theme';
import type { NotificationDto } from '@/types/api';

/** Icon glyph + palette tokens (resolved with the active theme, so it follows dark mode). */
type IconStyle = { icon: FeatherIconName; color: PaletteToken; background: PaletteToken };

/** Icon tile per notification type (PLAN.md §7.3 SC-22). */
export const NOTIFICATION_ICON: Record<NotificationDto['type'], IconStyle> = {
  ORDER_PAID: { icon: 'shopping-cart', color: 'primaryText', background: 'primarySoft' },
  NEW_ANSWER: { icon: 'message-circle', color: 'secondaryText', background: 'secondarySoft' },
  COURSE_COMPLETED: { icon: 'award', color: 'goldText', background: 'surface' },
  SYSTEM: { icon: 'bell', color: 'textSecondary', background: 'surface' },
  // Teacher & admin (PLAN §2.4).
  COURSE_APPROVED: { icon: 'check-circle', color: 'primaryText', background: 'primarySoft' },
  COURSE_REJECTED: { icon: 'alert-circle', color: 'dangerText', background: 'dangerSoft' },
  NEW_COURSE: { icon: 'book-open', color: 'secondaryText', background: 'secondarySoft' },
  PROJECT_GRADED: { icon: 'award', color: 'goldText', background: 'surface' },
  REVIEW_REPLY: { icon: 'message-square', color: 'secondaryText', background: 'secondarySoft' },
};

/** Icon tile of a notification; an unknown future `type` falls back to the generic bell instead of crashing. */
export function getNotificationIcon(type: string): IconStyle {
  return (
    (NOTIFICATION_ICON as Record<string, IconStyle | undefined>)[type] ?? NOTIFICATION_ICON.SYSTEM
  );
}

/** Types whose title the app writes itself (the server stores English only); the body keeps the server detail. */
const LOCALIZED_TITLE_TYPES: ReadonlySet<NotificationDto['type']> = new Set([
  'COURSE_APPROVED',
  'COURSE_REJECTED',
  'NEW_COURSE',
  'PROJECT_GRADED',
  'REVIEW_REPLY',
]);

/**
 * Title of a notification in the UI language: the five teacher/admin types are translated by `type`,
 * everything else shows the server's (English) title.
 */
export function getNotificationTitle(
  notification: Pick<NotificationDto, 'type' | 'title'>,
): string {
  if (!LOCALIZED_TITLE_TYPES.has(notification.type)) return notification.title;
  return i18n.t(`notification:types.${notification.type as LocalizedType}`);
}

type LocalizedType =
  'COURSE_APPROVED' | 'COURSE_REJECTED' | 'NEW_COURSE' | 'PROJECT_GRADED' | 'REVIEW_REPLY';

/** Message keys the app can translate, with the params each one needs (mirrors `NOTIFICATION_MESSAGES` on the server). */
const MESSAGE_PARAMS = {
  NEW_DEVICE: ['device'],
  ORDER_PAID_ONE: ['courseTitle'],
  ORDER_PAID_MANY: ['count'],
  NEW_ANSWER: ['author', 'courseTitle'],
  COURSE_COMPLETED: ['courseTitle'],
  COURSE_APPROVED: ['courseTitle'],
  REVISION_APPROVED: ['courseTitle'],
  COURSE_REJECTED: ['courseTitle', 'reason'],
  REVISION_REJECTED: ['courseTitle', 'reason'],
  NEW_COURSE: ['teacher', 'courseTitle'],
  PROJECT_GRADED: ['projectTitle', 'courseTitle', 'grade'],
  REVIEW_REPLY: ['courseTitle'],
} as const;

type MessageKey = keyof typeof MESSAGE_PARAMS;

function isMessageKey(key: unknown): key is MessageKey {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(MESSAGE_PARAMS, key);
}

function hasParam(value: unknown): boolean {
  return (typeof value === 'string' && value.length > 0) || Number.isFinite(value);
}

export type NotificationText = { title: string; body: string };

/**
 * Title + body of a notification in the UI language. When the server sent a known `data.key` with every
 * param that message needs, the text comes from `notification:messages.<key>` (so it follows the
 * language picked in Settings); otherwise - old rows, unknown keys, missing params - it falls back to
 * the stored text (the type-based title for the teacher / admin types, see `getNotificationTitle`).
 * Read it while rendering with `useTranslation('notification')` mounted, so the row re-renders when the
 * language changes.
 */
export function getNotificationText(
  notification: Pick<NotificationDto, 'type' | 'title' | 'body' | 'data'>,
): NotificationText {
  const { key, params } = notification.data ?? {};
  if (isMessageKey(key) && params && MESSAGE_PARAMS[key].every((name) => hasParam(params[name]))) {
    return {
      title: i18n.t(`notification:messages.${key}.title`, params),
      body: i18n.t(`notification:messages.${key}.body`, params),
    };
  }
  return { title: getNotificationTitle(notification), body: notification.body };
}

/**
 * Where tapping a notification goes. By `type` (when given): `COURSE_APPROVED` / `COURSE_REJECTED` open
 * the studio page of the course, `NEW_COURSE` the course, `PROJECT_GRADED` the Projects tab of the
 * lesson player, `REVIEW_REPLY` the course reviews. Otherwise a question (SC-16) wins over a course
 * (SC-09), because a NEW_ANSWER carries both. `null` for notifications without a target (SYSTEM).
 */
export function getNotificationHref(
  data: NotificationDto['data'],
  type?: NotificationDto['type'],
): string | null {
  const courseId = data?.courseId;
  if (courseId) {
    switch (type) {
      case 'COURSE_APPROVED':
      case 'COURSE_REJECTED':
        return `/studio/${courseId}`;
      case 'PROJECT_GRADED':
        return `/learn/${courseId}?tab=projects`;
      case 'REVIEW_REPLY':
        return `/course/${courseId}/reviews`;
      case 'NEW_COURSE':
        return `/course/${courseId}`;
      default:
        break;
    }
  }
  if (data?.questionId) {
    return type && courseId
      ? `/question/${data.questionId}?courseId=${courseId}`
      : `/question/${data.questionId}`;
  }
  if (courseId) return `/course/${courseId}`;
  return null;
}
