import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, layout, radius, spacing } from '@/theme';
import type { NotificationDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { NOTIFICATION_ICON } from '../notificationMeta';

export type NotificationItemProps = {
  notification: NotificationDto;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (notification: NotificationDto) => void;
};

/** One row of SC-22: type icon, title, body, relative time and a primary dot while unread. */
function NotificationItemBase({ notification, onPress }: NotificationItemProps) {
  const { icon, color, background } = NOTIFICATION_ICON[notification.type];
  const time = formatRelativeTime(notification.createdAt);
  const label = [notification.isRead ? null : 'Unread', notification.title, notification.body, time]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        notification.isRead ? null : styles.unread,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: background }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <AppText
          variant={notification.isRead ? 'body' : 'label'}
          family={notification.isRead ? 'bodyMedium' : undefined}
          numberOfLines={2}
        >
          {notification.title}
        </AppText>
        <AppText variant="body" color="textSecondary" numberOfLines={2}>
          {notification.body}
        </AppText>
        <AppText variant="caption">{time}</AppText>
      </View>
      {notification.isRead ? null : <View style={styles.dot} testID="unread-dot" />}
    </Pressable>
  );
}

/** Loading placeholder with the footprint of a notification row. */
export function NotificationSkeleton() {
  return (
    <View style={styles.row} testID="notification-skeleton">
      <Skeleton width={40} height={40} borderRadius={radius.button} />
      <View style={styles.content}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="25%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  unread: { backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.85 },
  iconTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // Same rounded-square icon tile as the Home category grid.
    borderRadius: radius.button,
  },
  content: { flex: 1, gap: spacing.xs },
  // Centered on the first text line (title line-height 20).
  dot: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});

export const NotificationItem = memo(NotificationItemBase);
