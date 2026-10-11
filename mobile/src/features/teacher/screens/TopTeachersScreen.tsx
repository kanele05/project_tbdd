import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { TeacherSummary } from '@/types/api';

import { TeacherCard } from '../components/TeacherCard';
import { TeacherCardSkeleton } from '../components/TeacherSkeletons';
import { TopTeachersGrid } from '../components/TopTeachersGrid';
import { useTeachersInfinite } from '../hooks';

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5] as const;
const keyExtractor = (teacher: TeacherSummary): string => teacher.id;

type GridItemProps = { teacher: TeacherSummary; onOpen: (teacherId: string) => void };

/** One grid cell: gives `TeacherCard` a stable per-item `onPress` so `memo` keeps working. */
const GridItem = memo(function GridItem({ teacher, onOpen }: GridItemProps) {
  const handlePress = useCallback(() => onOpen(teacher.id), [onOpen, teacher.id]);
  return (
    <View style={styles.gridCell}>
      <TeacherCard teacher={teacher} onPress={handlePress} style={styles.card} />
    </View>
  );
});

function SkeletonGrid() {
  const { t } = useTranslation('teacher');
  return (
    <View
      style={styles.skeletonGrid}
      testID="top-teachers-skeleton"
      accessible
      accessibilityLabel={t('topTitle')}
      accessibilityState={{ busy: true }}
    >
      {SKELETON_KEYS.map((key) => (
        <View key={key} style={styles.cell}>
          <TeacherCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/** SC-19 Top teachers: two-column grid of portrait `TeacherCard`s, infinite scroll -> SC-18. */
export function TopTeachersScreen() {
  const { t } = useTranslation('teacher');
  const { colors } = useTheme();
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const query = useTeachersInfinite();
  const { data, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = query;

  const teachers = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const handleOpen = useCallback((teacherId: string) => {
    router.push(`/teacher/${teacherId}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TeacherSummary>) => (
      <GridItem teacher={item} onOpen={handleOpen} />
    ),
    [handleOpen],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  if (isWide) {
    return (
      <View style={themed.screen}>
        <TopTeachersGrid
          teachers={teachers}
          isPending={query.isPending}
          error={query.isError ? query.error : null}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleEndReached}
          onRetry={handleRefresh}
          onOpenTeacher={handleOpen}
        />
      </View>
    );
  }

  let body: ReactNode;
  if (query.isPending) {
    body = <SkeletonGrid />;
  } else if (query.isError && teachers.length === 0) {
    body = <ErrorState error={query.error} onRetry={handleRefresh} />;
  } else {
    body = (
      <FlashList
        data={teachers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        contentContainerStyle={{
          ...styles.content,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="users" title={t('top.emptyTitle')} message={t('top.emptyMessage')} />
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
    <View style={themed.screen}>
      <ScreenHeader title={t('topTitle')} />
      {body}
    </View>
  );
}

const GAP = spacing.md;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  // Cells carry half the column gap on each side; the list padding makes up the rest of 20 dp.
  content: {
    paddingHorizontal: layout.screenPaddingX - GAP / 2,
    paddingTop: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenPaddingX - GAP / 2,
    paddingTop: spacing.sm,
  },
  // FlashList already gives each of the 2 columns half the width: the cell only adds the gap.
  gridCell: { padding: GAP / 2 },
  cell: { width: '50%', padding: GAP / 2 },
  card: { width: '100%' },
  footer: { paddingVertical: spacing.lg },
});
