import { useCallback, useState, type ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import { AppText, ErrorState, Skeleton } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { layout, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { useCoursesInfinite, type CoursesInfiniteParams } from '../hooks';
import { openCourse } from '../navigation';
import { CourseResultList } from './CourseResultList';
import { InlineError } from './InlineError';

type CourseResultsProps = {
  params: CoursesInfiniteParams;
  /** Rendered (inside the list, so pull-to-refresh still works) when nothing matches. */
  emptyState: ReactElement;
  /** Extra list padding, e.g. the bottom inset on screens without a tab bar. */
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const SKELETON_COUNT = 5;

export function formatResultCount(total: number): string {
  return `${total} ${total === 1 ? 'Result' : 'Results'}`;
}

/**
 * "{total} Results" + infinite list of `CourseCardHorizontal` for a `GET /courses` query with
 * all 4 data states (skeleton, error + Retry, empty, list). Used by Search (SC-06) and
 * Course list (SC-08).
 */
export function CourseResults({ params, emptyState, contentContainerStyle }: CourseResultsProps) {
  const query = useCoursesInfinite(params);
  const { toggleBookmark } = useToggleBookmark();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { courses, total, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
  const { fetchNextPage, refetch } = query;

  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked),
    [toggleBookmark],
  );
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (query.isPending) {
    return (
      <View
        style={styles.skeletons}
        accessible
        accessibilityLabel="Loading"
        accessibilityState={{ busy: true }}
      >
        <Skeleton width={110} height={24} />
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <CourseCardHorizontalSkeleton key={index} />
        ))}
      </View>
    );
  }
  if (query.isError && courses.length === 0) {
    return <ErrorState error={query.error} onRetry={() => void refetch()} />;
  }

  return (
    <CourseResultList
      courses={courses}
      contentContainerStyle={contentContainerStyle}
      onPressCourse={handlePressCourse}
      onToggleBookmark={handleToggleBookmark}
      onEndReached={handleEndReached}
      isFetchingNextPage={isFetchingNextPage}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      ListHeaderComponent={
        total ? (
          <AppText variant="title" style={styles.title} accessibilityRole="header">
            {formatResultCount(total)}
          </AppText>
        ) : null
      }
      ListEmptyComponent={emptyState}
      ListFooterComponent={
        isFetchNextPageError ? (
          <View style={styles.footerError}>
            <InlineError
              message="Couldn't load more courses."
              onRetry={() => void fetchNextPage()}
            />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
  },
  title: { marginBottom: spacing.md },
  footerError: { marginTop: spacing.lg },
});
