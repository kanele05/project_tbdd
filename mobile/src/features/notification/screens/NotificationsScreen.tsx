import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { NotificationDto } from '@/types/api';

import { NotificationItem, NotificationSkeleton } from '../components/NotificationItem';
import { useMarkAllRead, useNotificationsInfinite } from '../hooks';
import { useOpenNotification } from '../useOpenNotification';
import { NotificationsDesktopScreen } from './NotificationsDesktopScreen';

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5] as const;
const keyExtractor = (item: NotificationDto): string => item.id;

/**
 * SC-22 Notifications (FR-23) on a phone: newest first, infinite. Tapping an item marks it read
 * (optimistic, the Home badge drops at once) and opens its target; "Mark all as read" clears the list.
 */
function NotificationsPhoneScreen() {
  const { t } = useTranslation('notification');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const query = useNotificationsInfinite();
  const { mutate: markAllRead } = useMarkAllRead();
  const { data, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const unreadCount = data?.pages[0]?.meta.unreadCount ?? 0;

  const handlePress = useOpenNotification();

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
    body = <ErrorState error={query.error} title={t('loadFailed')} onRetry={handleRefresh} />;
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
          <EmptyState icon="bell" title={t('emptyTitle')} message={t('emptyMessage')} />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primaryText} style={styles.footer} />
          ) : null
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />
      {query.isPending ? null : (
        <View style={styles.toolbar}>
          <AppText variant="caption" accessibilityLiveRegion="polite">
            {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}
          </AppText>
          <Button
            title={t('markAllRead')}
            variant="ghost"
            size="sm"
            onPress={handleMarkAll}
            disabled={unreadCount === 0}
          />
        </View>
      )}
      {body}
    </View>
  );
}

/** SC-22 Notifications: the phone list below 768 dp, the centred PC column from 768 dp (PLAN §2.5). */
export function NotificationsScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <NotificationsDesktopScreen /> : <NotificationsPhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: layout.screenPaddingX,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  footer: { paddingVertical: spacing.lg },
}));
