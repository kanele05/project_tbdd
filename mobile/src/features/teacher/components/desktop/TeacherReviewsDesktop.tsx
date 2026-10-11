import { StyleSheet, View } from 'react-native';

import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { TableLoadMore } from '@/components/layout/work';
import { ReviewCard } from '@/features/review/components/ReviewCard';
import { spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';

import { TeacherTabState } from '../TeacherTabState';

export type TeacherReviewsDesktopProps = {
  reviews: readonly ReviewDto[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

const COLUMN_MIN_WIDTH = 440;

/** REVIEWS tab of the PC teacher profile: review cards in two columns, "See more" for the next page. */
export function TeacherReviewsDesktop({
  reviews,
  isPending,
  isError,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TeacherReviewsDesktopProps) {
  if (isPending || reviews.length === 0) {
    return (
      <TeacherTabState
        tab="review"
        isPending={isPending}
        isError={isError}
        error={error}
        onRetry={onRetry}
      />
    );
  }
  return (
    <View style={styles.wrap} testID="teacher-reviews-desktop">
      <ResponsiveGrid minItemWidth={COLUMN_MIN_WIDTH} maxColumns={2}>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} showCourseTitle />
        ))}
      </ResponsiveGrid>
      <TableLoadMore hasMore={hasNextPage} isLoading={isFetchingNextPage} onPress={onLoadMore} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.lg } });
