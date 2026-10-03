import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, layout, spacing } from '@/theme';
import type { NotificationDto } from '@/types/api';

import { NotificationItem, NotificationSkeleton } from '../components/NotificationItem';
import { useMarkAllRead, useMarkRead, useNotificationsInfinite } from '../hooks';
import { getNotificationHref } from '../notificationMeta';

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5] as const;
const keyExtractor = (item: NotificationDto): string => item.id;

/**
 * SC-22 Notifications (FR-23): newest first, infinite. Tapping an item marks it read (optimistic,
 * the Home badge drops at once) and opens its target; "Mark all as read" clears the list.
 */
export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const query = useNotificationsInfinite();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead } = useMarkAllRead();
  const { data, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const unreadCount = data?.pages[0]?.meta.unreadCount ?? 0;

  const handlePress = useCallback(
    (notification: NotificationDto) => {
      if (!notification.isRead) markRead(notification.id);
      const href = getNotificationHref(notification.data);
      if (href) router.push(href);
    },
    [markRead],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NotificationDto>) => (
      <NotificationItem notification={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => void refetch(), [refetch]);
  const handleMarkAll = useCallback(() => markAllRead(), [markAllRead]);

  let body: ReactNode;
  if (query.isPending) {
    body = (
      <View testID="notifications-skeleton">
        {SKELETON_KEYS.map((key) => (
          <NotificationSkeleton key={key} />
        ))}
      </View>
    );
  } else if (query.isError && items.length === 0) {
    body = <ErrorState error={query.error} onRetry={handleRefresh} />;
  } else {
    body = (
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title="No notifications yet"
            message="Updates about your orders, answers and courses will appear here."
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.footer} />
          ) : null
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      {query.isPending ? null : (
        <View style={styles.toolbar}>
          <AppText variant="caption" accessibilityLiveRegion="polite">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </AppText>
          <Pressable
            onPress={handleMarkAll}
            disabled={unreadCount === 0}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            accessibilityState={{ disabled: unreadCount === 0 }}
            style={unreadCount === 0 ? styles.disabled : null}
          >
            <AppText variant="label" color="primaryText">
              Mark all as read
            </AppText>
          </Pressable>
        </View>
      )}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: layout.screenPaddingX,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disabled: { opacity: 0.4 },
  footer: { paddingVertical: spacing.lg },
});
