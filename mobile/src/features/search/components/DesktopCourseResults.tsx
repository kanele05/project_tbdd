import { useCallback, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CourseCardDesktop, CourseCardDesktopSkeleton } from '@/components/course';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { AppText, Button, ErrorState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';

import { useCoursesInfinite, type CoursesInfiniteParams } from '../hooks';
import { useQuickCardActions } from '../useQuickCardActions';
import { InlineError } from './InlineError';

type DesktopCourseResultsProps = {
  params: CoursesInfiniteParams;
  /** Title block / filter toolbar above the "{total} Results" line. */
  topContent?: ReactNode;
  /** Shown when nothing matches. */
  emptyState: ReactElement;
  testID?: string;
};

export const GRID_MIN_ITEM_WIDTH = 220;
const SKELETON_COUNT = 8;
const LOAD_AHEAD_DP = 480;

/**
 * Wide-screen version of `CourseResults` (Search results, Course list): a poster grid of hover
 * cards inside the page container, loaded page by page while scrolling (plus a "Load more"
 * button). Same four data states as the phone list: skeleton, error + Retry, empty, results.
 */
export function DesktopCourseResults({
  params,
  topContent,
  emptyState,
  testID,
}: DesktopCourseResultsProps) {
  const { t } = useTranslation(['search', 'common']);
  const { colors } = useTheme();
  const query = useCoursesInfinite(params);
  const actions = useQuickCardActions();
  const { courses, total, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
  const { fetchNextPage, refetch } = query;

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      const isNearEnd =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - LOAD_AHEAD_DP;
      if (isNearEnd && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage],
  );

  let body: ReactNode;
  if (query.isPending) {
    body = (
      <View
        accessible
        accessibilityLabel={t('common:loading')}
        accessibilityState={{ busy: true }}
        testID="results-skeleton"
      >
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <CourseCardDesktopSkeleton key={index} />
          ))}
        </ResponsiveGrid>
      </View>
    );
  } else if (query.isError && courses.length === 0) {
    body = <ErrorState error={query.error} onRetry={() => void refetch()} />;
  } else if (courses.length === 0) {
    body = emptyState;
  } else {
    body = (
      <>
        {total ? (
          <AppText variant="title" accessibilityRole="header" style={styles.total}>
            {t('search:results', { count: total })}
          </AppText>
        ) : null}
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} liftOnHover testID="results-grid">
          {courses.map((course) => (
            <CourseCardDesktop
              key={course.id}
              course={course}
              onPress={actions.onPress}
              onToggleBookmark={actions.onToggleBookmark}
              onAddToCart={actions.onAddToCart}
            />
          ))}
        </ResponsiveGrid>
        <View style={styles.footer}>
          {isFetchingNextPage ? <ActivityIndicator color={colors.primaryText} /> : null}
          {isFetchNextPageError ? (
            <InlineError message={t('search:loadMoreError')} onRetry={() => void fetchNextPage()} />
          ) : null}
          {hasNextPage && !isFetchingNextPage && !isFetchNextPageError ? (
            <Button
              title={t('search:loadMore')}
              variant="outline"
              onPress={() => void fetchNextPage()}
            />
          ) : null}
        </View>
      </>
    );
  }

  return (
    <ScrollView
      testID={testID}
      onScroll={handleScroll}
      scrollEventThrottle={64}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <PageContainer>
        {topContent}
        {body}
      </PageContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: DESKTOP_NAV_HEIGHT + spacing.xl, paddingBottom: spacing.huge },
  total: { marginBottom: spacing.lg },
  footer: { alignItems: 'center', paddingVertical: spacing.xxl },
});
