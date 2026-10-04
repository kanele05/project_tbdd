import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { spacing, useTheme } from '@/theme';
import type { ReviewSummaryDto } from '@/types/api';

export type ReviewsHeadlineProps = {
  summary: ReviewSummaryDto;
  onViewAll: () => void;
};

/** SC-09 Review tab headline: gold star, serif "4.5/5", "(1,233+ reviews)" and "View all". */
function ReviewsHeadlineBase({ summary, onViewAll }: ReviewsHeadlineProps) {
  const { t } = useTranslation('review');
  const { colors } = useTheme();
  const rating = formatNumber(summary.avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <View style={styles.row}>
      <View
        style={styles.rating}
        accessible
        accessibilityLabel={t('headline.a11y', { rating, count: summary.count })}
      >
        <Ionicons name="star" size={22} color={colors.star} />
        <AppText variant="h2">{t('headline.rated', { rating })}</AppText>
        <AppText variant="caption" numberOfLines={1} style={styles.count}>
          {`(${t('headline.count', { count: summary.count })})`}
        </AppText>
      </View>
      <Pressable
        onPress={onViewAll}
        hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
        accessibilityRole="link"
        accessibilityLabel={t('viewAllA11y')}
      >
        <AppText variant="caption" color="primaryText" family="bodySemiBold">
          {t('viewAll')}
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
  rating: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { flexShrink: 1 },
});

export const ReviewsHeadline = memo(ReviewsHeadlineBase);
