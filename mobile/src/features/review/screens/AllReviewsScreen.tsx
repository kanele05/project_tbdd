import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { colors, layout, spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';

import { ReviewCard } from '../components/ReviewCard';
import { ReviewCardSkeleton } from '../components/ReviewCardSkeleton';
import { ReviewSummary } from '../components/ReviewSummary';
import { StarFilterChips } from '../components/StarFilterChips';
import { useCourseReviews, useReviewSummary, type ReviewFilter } from '../hooks';
import { REVIEW_STRINGS } from '../strings';

export type AllReviewsScreenProps = { courseId: string };

function keyExtractor(review: ReviewDto): string {
  return review.id;
}

function renderReview({ item }: { item: ReviewDto }) {
  return (
    <View style={styles.item}>
      <ReviewCard review={item} />
    </View>
  );
}

/**
 * SC-10 All reviews (M-15b): the rating summary (average + one bar per star), the star filter
 * chips and an infinite list of reviews with pull-to-refresh.
 */
export function AllReviewsScreen({ courseId }: AllReviewsScreenProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const reviews = useCourseReviews(courseId, filter);
  const summary = useReviewSummary(courseId);
  const { refetch: refetchReviews } = reviews;
  const { refetch: refetchSummary } = summary;

  const items = useMemo(() => flattenPages(reviews.data?.pages), [reviews.data]);

  const handleRefresh = useCallback(() => {
    void refetchSummary();
    void refetchReviews();
  }, [refetchReviews, refetchSummary]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = reviews;
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.summary}>
          {summary.data ? <ReviewSummary summary={summary.data} /> : <Skeleton height={96} />}
        </View>
        <StarFilterChips value={filter} onChange={setFilter} />
      </View>
    ),
    [filter, summary.data],
  );

  let empty = null;
  if (isOfflineWithoutData(reviews)) {
    empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRefresh} />;
  } else if (reviews.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
      </View>
    );
  } else if (reviews.isError) {
    empty = (
      <ErrorState error={reviews.error} title={REVIEW_STRINGS.loadFailed} onRetry={handleRefresh} />
    );
  } else if (filter === 'all') {
    empty = <EmptyState icon="message-square" title={REVIEW_STRINGS.noReviewsTitle} />;
  } else {
    empty = (
      <EmptyState
        icon="star"
        title={REVIEW_STRINGS.noReviewsForRating(filter)}
        message={REVIEW_STRINGS.noReviewsForRatingMessage}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={REVIEW_STRINGS.allReviewsTitle} />
      <FlashList
        testID="all-reviews-list"
        data={items}
        renderItem={renderReview}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={reviews.isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
  header: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  summary: { paddingHorizontal: layout.screenPaddingX },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.lg },
  skeletons: { gap: spacing.lg, paddingHorizontal: layout.screenPaddingX },
  footer: { paddingVertical: spacing.lg },
});
