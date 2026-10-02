import type { FeatherIconName } from '@/components/ui/icons';
import { colors } from '@/theme';
import type { NotificationDto } from '@/types/api';

type IconStyle = { icon: FeatherIconName; color: string; background: string };

/** Icon tile per notification type (PLAN.md §7.3 SC-22). */
export const NOTIFICATION_ICON: Record<NotificationDto['type'], IconStyle> = {
  ORDER_PAID: { icon: 'shopping-cart', color: colors.primary, background: colors.primaryLight },
  NEW_ANSWER: {
    icon: 'message-circle',
    color: colors.secondary,
    background: colors.secondaryLight,
  },
  COURSE_COMPLETED: { icon: 'award', color: colors.orange, background: colors.surface },
  SYSTEM: { icon: 'bell', color: colors.textSecondary, background: colors.surface },
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
