import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarClearance } from '@/components/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { CourseStatus, StudioCourseSummaryDto, StudioListSummaryDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { StudioCourseCard, StudioCourseCardSkeleton } from '../components/StudioCourseCard';
import { useStudioCourses } from '../hooks';

type StatusFilter = CourseStatus | 'all';

const FILTERS: readonly StatusFilter[] = [
  'all',
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

function keyExtractor(item: StudioCourseSummaryDto): string {
  return item.id;
}

function openCourse(course: StudioCourseSummaryDto): void {
  router.push({ pathname: '/studio/[id]', params: { id: course.id } });
}

function createCourse(): void {
  router.push({ pathname: '/studio/[id]/edit', params: { id: 'new' } });
}

function SummaryTiles({ summary }: { summary: StudioListSummaryDto }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const tiles = [
    { key: 'courses', value: formatNumber(summary.courseCount), label: t('summary.courses') },
    {
      key: 'students',
      value: formatNumber(summary.totalEnrollments),
      label: t('summary.students'),
    },
    { key: 'revenue', value: formatPrice(summary.totalRevenueCents), label: t('summary.revenue') },
  ];
  return (
    <View style={styles.tiles} testID="studio-summary">
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={styles.tile}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}`}
        >
          <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {tile.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * SC-23 Studio - my courses (FR-39). A big title with the "New course" button, three totals
 * (courses, students, simulated revenue), status filter chips and one card per course. Refetches
 * when the tab regains focus so a course submitted a moment ago shows its new status.
 */
export function StudioHomeScreen() {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const query = useStudioCourses(filter);
  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage, summary } = query;

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });
  const isFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      void refetchRef.current();
    }, []),
  );

  const [isPulling, setIsPulling] = useState(false);
  const handlePull = useCallback(async () => {
    setIsPulling(true);
    try {
      await refetch();
    } finally {
      setIsPulling(false);
    }
  }, [refetch]);
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: StudioCourseSummaryDto }) => (
      <View style={styles.item}>
        <StudioCourseCard course={item} onPress={openCourse} />
      </View>
    ),
    [styles],
  );

  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <AppText variant="h1" accessibilityRole="header">
              {t('title')}
            </AppText>
            <AppText variant="caption">{t('subtitle')}</AppText>
          </View>
        </View>
        <Button
          title={t('newCourse')}
          leftIcon="plus"
          onPress={createCourse}
          fullWidth
          testID="studio-new-course"
        />
        {summary ? <SummaryTiles summary={summary} /> : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          accessibilityRole="tablist"
        >
          {FILTERS.map((key) => {
            const count = key === 'all' ? summary?.courseCount : summary?.byStatus[key];
            const label = key === 'all' ? t('filter.all') : t(`status.${key}`);
            return (
              <Chip
                key={key}
                label={count === undefined ? label : `${label} (${count})`}
                selected={filter === key}
                size="sm"
                onPress={() => setFilter(key)}
                testID={`studio-filter-${key}`}
              />
            );
          })}
        </ScrollView>
      </View>
    ),
    [filter, insets.top, styles, summary, t],
  );

  let empty = null;
  if (isOfflineWithoutData(query)) {
    empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (query.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <StudioCourseCardSkeleton />
        <StudioCourseCardSkeleton />
        <StudioCourseCardSkeleton />
      </View>
    );
  } else if (query.isError) {
    empty = <ErrorState error={query.error} title={t('loadFailed')} onRetry={handleRetry} />;
  } else if (filter === 'all') {
    empty = (
      <EmptyState
        icon="edit-3"
        title={t('empty.title')}
        message={t('empty.message')}
        actionLabel={t('newCourse')}
        onAction={createCourse}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon="filter"
        title={t('empty.filteredTitle')}
        message={t('empty.filteredMessage', { status: t(`status.${filter}`) })}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <FlashList
        testID="studio-course-list"
        data={query.courses}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshing={isPulling}
        onRefresh={handlePull}
        onEndReached={handleEnd}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: clearance + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  header: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { flex: 1, gap: spacing.xs },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  skeletons: { gap: spacing.md, paddingHorizontal: layout.screenPaddingX },
}));
