import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, layout, spacing } from '@/theme';
import type { TeacherSummary } from '@/types/api';

import { TeacherCard } from '../components/TeacherCard';
import { TeacherCardSkeleton } from '../components/TeacherSkeletons';
import { useTeachersInfinite } from '../hooks';

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5] as const;
const keyExtractor = (teacher: TeacherSummary): string => teacher.id;

type GridItemProps = { teacher: TeacherSummary; onOpen: (teacherId: string) => void };

/** One grid cell: gives `TeacherCard` a stable per-item `onPress` so `memo` keeps working. */
const GridItem = memo(function GridItem({ teacher, onOpen }: GridItemProps) {
  const handlePress = useCallback(() => onOpen(teacher.id), [onOpen, teacher.id]);
  return (
    <View style={styles.cell}>
      <TeacherCard teacher={teacher} onPress={handlePress} style={styles.card} />
    </View>
  );
});

function SkeletonGrid() {
  return (
    <View style={styles.skeletonGrid} testID="top-teachers-skeleton">
      {SKELETON_KEYS.map((key) => (
        <View key={key} style={styles.cell}>
          <TeacherCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/** SC-19 Top teachers (Could): two-column grid of `TeacherCard`, infinite scroll -> SC-18. */
export function TopTeachersScreen() {
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No teachers yet"
            message="Top-rated teachers will show up here."
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
      <ScreenHeader title="Top teachers" />
      {body}
    </View>
  );
}

const GAP = spacing.md;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Cells carry half the column gap on each side; the list padding makes up the rest of 20 dp.
  content: {
    paddingHorizontal: layout.screenPaddingX - GAP / 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenPaddingX - GAP / 2,
    paddingTop: spacing.sm,
  },
  cell: { width: '50%', padding: GAP / 2 },
  card: { width: '100%' },
  footer: { paddingVertical: spacing.lg },
});
