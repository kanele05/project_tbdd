import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { TableLoadMore, WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { NotificationSkeleton } from '../components/NotificationItem';
import { NotificationRowDesktop } from '../components/NotificationRowDesktop';
import { useMarkAllRead, useNotificationsInfinite } from '../hooks';
import { groupNotificationsByDay } from '../notificationGroups';
import { useOpenNotification } from '../useOpenNotification';

const LIST_MAX_WIDTH = 780;
const SKELETON_KEYS = [0, 1, 2, 3, 4] as const;

/**
 * SC-22 Notifications on a PC window (PLAN §2.5): a centred 780 dp column. The title row carries
 * the unread count and "Mark all as read"; the list is grouped into Today / Yesterday / Earlier,
 * unread rows are tinted with a dot, and "See more" loads the next page.
 */
export function NotificationsDesktopScreen() {
  const { t } = useTranslation(['notification', 'common']);
  const styles = useStyles();
  const query = useNotificationsInfinite();
  const { mutate: markAllRead } = useMarkAllRead();
  const openNotification = useOpenNotification();
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const groups = useMemo(() => groupNotificationsByDay(items), [items]);
  const unreadCount = data?.pages[0]?.meta.unreadCount ?? 0;
  const handleMarkAll = useCallback(() => markAllRead(), [markAllRead]);
  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  let subtitle: string | undefined;
  if (!query.isPending) {
    subtitle =
      unreadCount > 0
        ? t('notification:unreadCount', { count: unreadCount })
        : t('notification:allCaughtUp');
  }

  let body: ReactNode;
  if (query.isPending) {
    body = (
      <View style={styles.panel} testID="notifications-skeleton">
        {SKELETON_KEYS.map((key) => (
          <NotificationSkeleton key={key} />
        ))}
      </View>
    );
  } else if (query.isError && items.length === 0) {
    body = (
      <ErrorState error={query.error} title={t('notification:loadFailed')} onRetry={handleRetry} />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="bell"
        title={t('notification:emptyTitle')}
        message={t('notification:emptyMessage')}
      />
    );
  } else {
    body = (
      <View style={styles.groups} testID="notifications-list">
        {groups.map((group) => (
          <View key={group.key} style={styles.group} testID={`notifications-group-${group.key}`}>
            <AppText variant="label" color="textSecondary" accessibilityRole="header">
              {t(`notification:groups.${group.key}`)}
            </AppText>
            <View style={styles.panel}>
              {group.items.map((notification, index) => (
                <NotificationRowDesktop
                  key={notification.id}
                  notification={notification}
                  onPress={openNotification}
                  isLast={index === group.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
        <TableLoadMore
          hasMore={Boolean(hasNextPage)}
          isLoading={isFetchingNextPage}
          onPress={handleLoadMore}
        />
      </View>
    );
  }

  return (
    <WorkShell maxWidth={LIST_MAX_WIDTH} testID="notifications-desktop">
      <WorkHeader
        title={t('notification:title')}
        subtitle={subtitle}
        right={
          query.isPending ? null : (
            <Button
              title={t('notification:markAllRead')}
              variant="secondary"
              size="sm"
              leftIcon="check-circle"
              onPress={handleMarkAll}
              disabled={unreadCount === 0}
              testID="notifications-mark-all"
            />
          )
        }
      />
      {body}
    </WorkShell>
  );
}

const useStyles = makeStyles((t) => ({
  groups: { gap: spacing.xl },
  group: { gap: spacing.sm },
  panel: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));
