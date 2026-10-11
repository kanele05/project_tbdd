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
