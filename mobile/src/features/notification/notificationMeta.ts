import type { FeatherIconName } from '@/components/ui/icons';
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
};

/**
 * Where tapping a notification goes: a question (SC-16) wins over a course (SC-09), because a
 * NEW_ANSWER carries both. `null` for notifications without a target (SYSTEM).
 */
export function getNotificationHref(data: NotificationDto['data']): string | null {
  if (data?.questionId) return `/question/${data.questionId}`;
  if (data?.courseId) return `/course/${data.courseId}`;
  return null;
}
