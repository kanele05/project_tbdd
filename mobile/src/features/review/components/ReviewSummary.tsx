import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StarRating } from '@/components/ui/StarRating';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { spacing, useTheme } from '@/theme';
import type { ReviewSummaryDto } from '@/types/api';

export type ReviewSummaryProps = {
  summary: ReviewSummaryDto;
};

const STARS = [5, 4, 3, 2, 1] as const;

/** SC-10 header: the serif average + total on the left, one gold bar per star (5 -> 1) on the right. */
function ReviewSummaryBase({ summary }: ReviewSummaryProps) {
  const { t } = useTranslation('review');
  const { colors } = useTheme();
  const { avg, count, distribution } = summary;
  const rating = formatNumber(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <View style={styles.container}>
      <View
        style={styles.average}
        accessible
        accessibilityLabel={t('summary.a11y', { rating, count })}
      >
        <AppText variant="hero" style={styles.averageValue}>
          {rating}
        </AppText>
        <StarRating value={avg} size={14} />
        <AppText variant="caption">{t('summary.reviews', { count })}</AppText>
      </View>
      <View style={styles.bars}>
        {STARS.map((star) => {
          const starCount = distribution[star] ?? 0;
          const percent = count > 0 ? (starCount / count) * 100 : 0;
          return (
            <View
              key={star}
              style={styles.barRow}
              accessible
              accessibilityLabel={t('summary.starRow', { star, count: starCount })}
            >
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
                {formatNumber(starCount)}
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
  average: { alignItems: 'center', gap: spacing.xs, minWidth: 96 },
  // `hero` is 38/44: tabular enough for "4.5" and still a clear focal number.
  averageValue: { textAlign: 'center' },
  bars: { flex: 1, gap: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 20 },
  starLabel: { minWidth: 10, textAlign: 'right' },
  track: { flex: 1, marginLeft: spacing.xs },
  starCount: { minWidth: 32, textAlign: 'right' },
});

export const ReviewSummary = memo(ReviewSummaryBase);
