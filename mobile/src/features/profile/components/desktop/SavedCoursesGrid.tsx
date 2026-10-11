import { useCallback } from 'react';
import { View } from 'react-native';

import {
  CourseCardDesktop,
  CourseCardDesktopSkeleton,
  type DesktopCardCourse,
} from '@/components/course';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { TableLoadMore } from '@/components/layout/work';
import { AppText, EmptyState, ErrorState, showToast } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { openSearchTab } from '@/features/search/navigation';
import { useQuickCardActions } from '@/features/search/useQuickCardActions';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { useBookmarks } from '../../hooks';

const GRID_MIN_ITEM_WIDTH = 240;
const GRID_MAX_COLUMNS = 4;
const SKELETON_KEYS = ['a', 'b', 'c'] as const;

/**
 * "Saved courses" of the PC profile: hover cards in a responsive grid (open, add to cart, un-save
 * with an Undo toast), loaded 20 at a time. Four states: skeleton, error with Retry, empty with
 * "Explore courses", cards.
 */
export function SavedCoursesGrid() {
  const { t } = useTranslation(['profile', 'common']);
  const styles = useStyles();
  const bookmarks = useBookmarks();
  const { toggleBookmark } = useToggleBookmark();
  const { onPress, onAddToCart } = useQuickCardActions();
  const { courses, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = bookmarks;

  const handleToggleBookmark = useCallback(
    (card: DesktopCardCourse) => {
      const course = courses.find((item) => item.id === card.id);
      if (!course) return;
      toggleBookmark(course.id, course.isBookmarked, course);
      showToast(t('profile:removedFromSaved'), {
        actionLabel: t('profile:undo'),
        onAction: () => toggleBookmark(course.id, false, course),
      });
    },
    [courses, toggleBookmark, t],
  );
  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  let body;
  if (bookmarks.isPending) {
    body = (
      <View
        accessible
        accessibilityLabel={t('common:loading')}
        accessibilityState={{ busy: true }}
        testID="profile-saved-skeleton"
      >
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} maxColumns={GRID_MAX_COLUMNS}>
          {SKELETON_KEYS.map((key) => (
            <CourseCardDesktopSkeleton key={key} />
          ))}
        </ResponsiveGrid>
      </View>
    );
  } else if (bookmarks.isError && courses.length === 0) {
    body = <ErrorState error={bookmarks.error} onRetry={() => void refetch()} />;
  } else if (courses.length === 0) {
    body = (
      <EmptyState
        icon="bookmark"
        title={t('profile:empty.title')}
        message={t('profile:empty.message')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={openSearchTab}
      />
    );
  } else {
    body = (
      <>
        <ResponsiveGrid
          minItemWidth={GRID_MIN_ITEM_WIDTH}
          maxColumns={GRID_MAX_COLUMNS}
          liftOnHover
          testID="profile-saved-grid"
        >
          {courses.map((course) => (
            <CourseCardDesktop
              key={course.id}
              course={course}
              onPress={onPress}
              onToggleBookmark={handleToggleBookmark}
              onAddToCart={onAddToCart}
            />
          ))}
        </ResponsiveGrid>
        <TableLoadMore
          hasMore={Boolean(hasNextPage)}
          isLoading={isFetchingNextPage}
          onPress={handleLoadMore}
        />
      </>
    );
  }

  return (
    <View style={styles.section} testID="profile-saved">
      <AppText variant="h2" accessibilityRole="header">
        {t('profile:savedCourses')}
      </AppText>
      {body}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  section: { gap: spacing.lg },
}));
