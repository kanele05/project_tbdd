import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';
import type { ReviewSummaryDto } from '@/types/api';

import { REVIEW_STRINGS } from '../strings';

export type ReviewsHeadlineProps = {
  summary: ReviewSummaryDto;
  onViewAll: () => void;
};

/** "1233+ reviews" like the design; a single review reads "1 review". */
export function formatReviewCount(count: number): string {
  return count === 1 ? '1 review' : `${count}+ reviews`;
}

/** SC-09 Review tab headline: "☆ 4.5/5 (1233+ reviews)" and the "View all" link. */
function ReviewsHeadlineBase({ summary, onViewAll }: ReviewsHeadlineProps) {
  return (
    <View style={styles.row}>
      <View
        style={styles.rating}
        accessible
        accessibilityLabel={`Rated ${summary.avg.toFixed(1)} out of 5, ${formatReviewCount(summary.count)}`}
      >
        <Ionicons name="star-outline" size={22} color={colors.star} />
        <AppText variant="h2">{`${summary.avg.toFixed(1)}/5`}</AppText>
        <AppText variant="caption" color="textSecondary">
          {`(${formatReviewCount(summary.count)})`}
        </AppText>
      </View>
      <Pressable
        onPress={onViewAll}
        hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
        accessibilityRole="link"
        accessibilityLabel={`${REVIEW_STRINGS.viewAll} reviews`}
      >
        <AppText variant="caption" color="primaryText" family="bodyMedium">
          {REVIEW_STRINGS.viewAll}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});

export const ReviewsHeadline = memo(ReviewsHeadlineBase);
