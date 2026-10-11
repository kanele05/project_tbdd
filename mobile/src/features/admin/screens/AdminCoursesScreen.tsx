import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableLoadMore, WorkHeader, WorkShell } from '@/components/layout/work';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AdminCourseQueueItemDto } from '@/types/api';

import {
  buildQueueParams,
  normalizeQueueStatus,
  QUEUE_STATUSES,
  type QueueStatus,
  type QueueType,
} from '../adminMeta';
import { AdminErrorState } from '../components/AdminErrorState';
import { QueueTable } from '../components/desktop/QueueTable';
import { QueueItem } from '../components/QueueItem';
import { useAdminCourses } from '../hooks';

const SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const keyExtractor = (item: AdminCourseQueueItemDto): string => `${item.type}:${item.id}`;
const openCourse = (item: AdminCourseQueueItemDto): void =>
  router.push(`/admin/courses/${item.id}`);

function QueueSkeleton({ isFlush }: { isFlush: boolean }) {
  const styles = useStyles();
  return (
    <View testID="queue-skeleton">
      {SKELETON_KEYS.map((key) => (
        <Skeleton
          key={key}
          height={104}
          borderRadius={radius.card}
          style={isFlush ? styles.skeletonFlush : styles.skeleton}
        />
      ))}
    </View>
  );
}

/**
 * SC-32 Review queue (FR-50): new courses or pending revisions, filtered by status (pending by
 * default, FIFO). Infinite list with pull-to-refresh; tapping a row opens SC-33.
 */
export function AdminCoursesScreen() {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const [type, setType] = useState<QueueType>('course');
  const [status, setStatus] = useState<QueueStatus>('PENDING_REVIEW');
  const params = useMemo(() => buildQueueParams(type, status), [type, status]);
  const query = useAdminCourses(params);
  const { data, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const pending = data?.pages[0]?.meta.pending;

  const typeTabs = useMemo<SegmentedTab<QueueType>[]>(
    () => [
      {
        key: 'course',
        label: pending
          ? t('queue.typeWithCount', { label: t('queue.type.course'), count: pending.courses })
          : t('queue.type.course'),
      },
      {
        key: 'revision',
        label: pending
          ? t('queue.typeWithCount', { label: t('queue.type.revision'), count: pending.revisions })
          : t('queue.type.revision'),
      },
    ],
    [pending, t],
  );

  const handleTypeChange = useCallback((next: QueueType) => {
    setType(next);
    setStatus((current) => normalizeQueueStatus(next, current));
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AdminCourseQueueItemDto>) => (
      <QueueItem item={item} onPress={openCourse} />
    ),
    [],
  );
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  let body: ReactNode;
  if (query.isPending) {
    body = <QueueSkeleton isFlush={false} />;
  } else if (query.isError && items.length === 0) {
    body = (
      <AdminErrorState error={query.error} title={t('queue.loadFailed')} onRetry={handleRefresh} />
    );
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
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="check-square"
            title={t('queue.emptyTitle')}
            message={t(`queue.emptyMessage.${status}`)}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primaryText} style={styles.footer} />
          ) : null
        }
      />
    );
  }

  const statusChips = (
    <View style={[styles.chips, isWide ? styles.chipsFlush : null]} accessibilityRole="radiogroup">
      {QUEUE_STATUSES[type].map((key) => (
        <Chip
          key={key}
          label={t(`status.${key}`)}
          size="sm"
          selected={status === key}
          onPress={() => setStatus(key)}
          testID={`queue-status-${key}`}
        />
      ))}
    </View>
  );

  if (isWide) {
    let wideBody: ReactNode;
    if (query.isPending) wideBody = <QueueSkeleton isFlush />;
    else if (query.isError && items.length === 0) {
      wideBody = (
        <AdminErrorState
          error={query.error}
          title={t('queue.loadFailed')}
          onRetry={handleRefresh}
        />
      );
    } else if (items.length === 0) {
      wideBody = (
        <EmptyState
          icon="check-square"
          title={t('queue.emptyTitle')}
          message={t(`queue.emptyMessage.${status}`)}
        />
      );
    } else wideBody = <QueueTable items={items} onPress={openCourse} />;
    return (
      <WorkShell testID="admin-queue-desktop">
        <WorkHeader title={t('queue.title')} subtitle={t('queue.subtitle')} hasBack />
        <View style={styles.toolbar}>
          <SegmentedTabs
            tabs={typeTabs}
            value={type}
            onChange={handleTypeChange}
            style={styles.wideTabs}
          />
          {statusChips}
        </View>
        {wideBody}
        <TableLoadMore
          hasMore={Boolean(hasNextPage)}
          isLoading={isFetchingNextPage}
          onPress={handleEndReached}
        />
      </WorkShell>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('queue.title')} />
      <SegmentedTabs tabs={typeTabs} value={type} onChange={handleTypeChange} style={styles.tabs} />
      {statusChips}
      {body}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  tabs: { marginHorizontal: layout.screenPaddingX },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
  },
  chipsFlush: { paddingHorizontal: 0, paddingTop: 0 },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  wideTabs: { width: 340 },
  skeleton: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.md },
  skeletonFlush: { marginTop: spacing.md },
  footer: { paddingVertical: spacing.lg },
}));
