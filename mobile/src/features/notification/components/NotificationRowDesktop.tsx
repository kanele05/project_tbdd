import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { NotificationDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { getNotificationIcon, getNotificationText } from '../notificationMeta';

export type NotificationRowDesktopProps = {
  notification: NotificationDto;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (notification: NotificationDto) => void;
  /** The last row of a group has no divider under it. */
  isLast?: boolean;
};

/**
 * One row of the PC notification list: type icon, title, body, relative time on the right and an
 * accent dot while unread (unread rows also get a soft accent tint). Hover darkens the row.
 */
function NotificationRowDesktopBase({
  notification,
  onPress,
  isLast = false,
}: NotificationRowDesktopProps) {
  const { t } = useTranslation('notification');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const { icon, color, background } = getNotificationIcon(notification.type);
  const time = formatRelativeTime(notification.createdAt);
  const { title, body } = getNotificationText(notification);
  const label = [notification.isRead ? null : t('unread'), title, body, time]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      {...hoverProps}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.row,
        notification.isRead ? null : styles.unread,
        isHovered ? styles.hover : null,
        isLast ? styles.last : null,
      ]}
      testID={`notification-row-${notification.id}`}
    >
      <View style={[styles.iconTile, { backgroundColor: colors[background] }]}>
        <Feather name={icon} size={20} color={colors[color]} />
      </View>
      <View style={styles.content}>
        <AppText
          variant="body"
          family={notification.isRead ? 'bodyMedium' : 'bodyBold'}
          numberOfLines={2}
        >
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" numberOfLines={2}>
          {body}
        </AppText>
      </View>
      <View style={styles.meta}>
        <AppText variant="caption">{time}</AppText>
        {notification.isRead ? null : <View style={styles.dot} testID="unread-dot" />}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    ...pointerStyle,
  },
  unread: { backgroundColor: t.colors.primarySoft },
  hover: { backgroundColor: t.colors.surface },
  last: { borderBottomWidth: 0 },
  iconTile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  content: { flex: 1, minWidth: 0, gap: spacing.xs },
  meta: { alignItems: 'flex-end', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: t.colors.primary },
}));

export const NotificationRowDesktop = memo(NotificationRowDesktopBase);
