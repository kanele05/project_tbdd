import { useCallback, memo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { AppText, Button, EmptyState, ErrorState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';
import type { TeacherSummary } from '@/types/api';

import { TeacherCard } from './TeacherCard';
import { TeacherCardSkeleton } from './TeacherSkeletons';

export type TopTeachersGridProps = {
  teachers: readonly TeacherSummary[];
  isPending: boolean;
  /** Set when the first page failed (nothing to show). */
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onOpenTeacher: (teacherId: string) => void;
};

const GRID_MIN_ITEM_WIDTH = 200;
const SKELETON_COUNT = 8;
const LOAD_AHEAD_DP = 480;

type CellProps = { teacher: TeacherSummary; onOpen: (teacherId: string) => void };

const Cell = memo(function Cell({ teacher, onOpen }: CellProps) {
  const handlePress = useCallback(() => onOpen(teacher.id), [onOpen, teacher.id]);
  return <TeacherCard teacher={teacher} onPress={handlePress} style={styles.card} />;
});

/** Top teachers on wide screens: portrait cards in a responsive grid, loaded page by page. */
export function TopTeachersGrid({
  teachers,
  isPending,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  onOpenTeacher,
}: TopTeachersGridProps) {
  const { t } = useTranslation('teacher');
  const { colors } = useTheme();

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      const isNearEnd =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - LOAD_AHEAD_DP;
      if (isNearEnd && hasNextPage && !isFetchingNextPage) onLoadMore();
    },
    [hasNextPage, isFetchingNextPage, onLoadMore],
  );

  let body: ReactNode;
  if (isPending) {
    body = (
      <View
        accessible
        accessibilityLabel={t('topTitle')}
        accessibilityState={{ busy: true }}
        testID="top-teachers-skeleton"
      >
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TeacherCardSkeleton key={index} />
          ))}
        </ResponsiveGrid>
      </View>
    );
  } else if (error && teachers.length === 0) {
    body = <ErrorState error={error} onRetry={onRetry} />;
  } else if (teachers.length === 0) {
    body = <EmptyState icon="users" title={t('top.emptyTitle')} message={t('top.emptyMessage')} />;
  } else {
    body = (
      <>
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} testID="top-teachers-grid">
          {teachers.map((teacher) => (
            <Cell key={teacher.id} teacher={teacher} onOpen={onOpenTeacher} />
          ))}
        </ResponsiveGrid>
        <View style={styles.footer}>
          {isFetchingNextPage ? <ActivityIndicator color={colors.primaryText} /> : null}
          {hasNextPage && !isFetchingNextPage ? (
            <Button title={t('top.loadMore')} variant="outline" onPress={onLoadMore} />
          ) : null}
        </View>
      </>
    );
  }

  return (
    <ScrollView
      onScroll={handleScroll}
      scrollEventThrottle={64}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <PageContainer>
        <AppText variant="h1" accessibilityRole="header" style={styles.title}>
          {t('topTitle')}
        </AppText>
        {body}
      </PageContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: DESKTOP_NAV_HEIGHT + spacing.xl, paddingBottom: spacing.huge },
  title: { marginBottom: spacing.xl },
  card: { width: '100%' },
  footer: { alignItems: 'center', paddingVertical: spacing.xxl },
});
