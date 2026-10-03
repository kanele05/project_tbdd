import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StarRating } from '@/components/ui/StarRating';
import { colors, spacing } from '@/theme';
import type { ReviewSummaryDto } from '@/types/api';

export type ReviewSummaryProps = {
  summary: ReviewSummaryDto;
};

const STARS = [5, 4, 3, 2, 1] as const;

/** SC-10 header: the average + total on the left, one bar per star (5 -> 1) on the right. */
function ReviewSummaryBase({ summary }: ReviewSummaryProps) {
  const { avg, count, distribution } = summary;
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Average rating ${avg.toFixed(1)} out of 5, ${count} ${count === 1 ? 'review' : 'reviews'}`}
    >
      <View style={styles.average}>
        <AppText variant="h1">{avg.toFixed(1)}</AppText>
        <StarRating value={avg} size={14} />
        <AppText variant="caption">
          {count} {count === 1 ? 'review' : 'reviews'}
        </AppText>
      </View>
      <View style={styles.bars}>
        {STARS.map((star) => {
          const starCount = distribution[star] ?? 0;
          const percent = count > 0 ? (starCount / count) * 100 : 0;
          return (
            <View key={star} style={styles.barRow}>
              <AppText variant="caption" color="textSecondary" style={styles.starLabel}>
                {star}
              </AppText>
              <Ionicons name="star" size={12} color={colors.star} />
              <View style={styles.track}>
                <ProgressBar
                  percent={percent}
                  height={6}
                  color={colors.star}
                  trackColor={colors.surface}
                />
              </View>
              <AppText variant="caption" style={styles.starCount}>
                {starCount}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  average: { alignItems: 'center', gap: spacing.xs, minWidth: 72 },
  bars: { flex: 1, gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  starLabel: { minWidth: 10, textAlign: 'right' },
  track: { flex: 1, marginLeft: spacing.xs },
  starCount: { minWidth: 32, textAlign: 'right' },
});

export const ReviewSummary = memo(ReviewSummaryBase);
