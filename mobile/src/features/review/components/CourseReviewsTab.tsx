import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { layout, spacing } from '@/theme';

import { useCourseReviews, useMyReview, useReviewSummary, type ReviewFilter } from '../hooks';
import { REVIEW_STRINGS } from '../strings';
import { ReviewCard } from './ReviewCard';
import { ReviewCardSkeleton } from './ReviewCardSkeleton';
import { ReviewsHeadline } from './ReviewsHeadline';
import { StarFilterChips } from './StarFilterChips';

export type CourseReviewsTabProps = {
  courseId: string;
  /** True when the current user is enrolled → show "Write a review" (SC-11). */
  canWriteReview: boolean;
};

/** The tab shows a taste of the reviews; the rest is behind "View all" (SC-10). */
const PREVIEW_COUNT = 5;

function openAllReviews(courseId: string): void {
  router.push({ pathname: '/course/[id]/reviews', params: { id: courseId } });
}

function openWriteReview(courseId: string): void {
  router.push({ pathname: '/course/[id]/write-review', params: { id: courseId } });
}

/**
 * SC-09 "REVIEW" tab (M-15a): "☆ 4.5/5 (1233+ reviews)" + View all, star filter chips, the
 * first reviews, and "Write a review" for enrolled users (FR-10, FR-11).
 */
export function CourseReviewsTab({ courseId, canWriteReview }: CourseReviewsTabProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const summary = useReviewSummary(courseId);
  const reviews = useCourseReviews(courseId, filter);
  const myReview = useMyReview(courseId, canWriteReview);

  const handleViewAll = useCallback(() => openAllReviews(courseId), [courseId]);
  const handleWrite = useCallback(() => openWriteReview(courseId), [courseId]);
  const handleRetry = useCallback(() => {
    void summary.refetch();
    void reviews.refetch();
  }, [reviews, summary]);

  const items = flattenPages(reviews.data?.pages).slice(0, PREVIEW_COUNT);
  const hasNoReviewsAtAll = summary.data !== undefined && summary.data.count === 0;

  let body;
  if (isOfflineWithoutData(reviews)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (reviews.isPending) {
    body = (
      <View style={styles.list}>
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
      </View>
    );
  } else if (reviews.isError && items.length === 0) {
    body = (
      <ErrorState error={reviews.error} title={REVIEW_STRINGS.loadFailed} onRetry={handleRetry} />
    );
  } else if (items.length === 0) {
    body =
      filter === 'all' || hasNoReviewsAtAll ? (
        <EmptyState
          icon="message-square"
          title={REVIEW_STRINGS.noReviewsTitle}
          message={canWriteReview ? REVIEW_STRINGS.noReviewsMessage : undefined}
        />
      ) : (
        <EmptyState
          icon="star"
          title={REVIEW_STRINGS.noReviewsForRating(filter)}
          message={REVIEW_STRINGS.noReviewsForRatingMessage}
        />
      );
  } else {
    body = (
      <View style={styles.list}>
        {items.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.padded}>
        {summary.data ? (
          <ReviewsHeadline summary={summary.data} onViewAll={handleViewAll} />
        ) : (
          <Skeleton width="60%" height={28} />
        )}
      </View>
      <StarFilterChips value={filter} onChange={setFilter} />
      <View style={styles.padded}>{body}</View>
      {canWriteReview ? (
        <View style={styles.padded}>
          <Button
            title={myReview.data ? REVIEW_STRINGS.editReview : REVIEW_STRINGS.writeReview}
            variant="outline"
            leftIcon="edit-3"
            fullWidth
            onPress={handleWrite}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The design starts the headline ~28 dp under the tabs (the course screen adds 24 dp).
  container: { gap: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  padded: { paddingHorizontal: layout.screenPaddingX },
  list: { gap: spacing.lg },
});
