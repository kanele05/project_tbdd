import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, spacing } from '@/theme';
import type { TeacherCourseStatsDto } from '@/types/api';

export type RatingDistributionProps = {
  distribution: TeacherCourseStatsDto['ratingDistribution'];
};

const STARS = [5, 4, 3, 2, 1] as const;
const BAR_HEIGHT = 8;

/** One horizontal bar per star (5 to 1) with the number of reviews, sized by the largest count. */
function RatingDistributionBase({ distribution }: RatingDistributionProps) {
  const { t } = useTranslation('teaching');
  const styles = useStyles();
  const max = Math.max(1, ...STARS.map((star) => distribution[star] ?? 0));
  return (
    <View style={styles.list} testID="rating-distribution">
      {STARS.map((star) => {
        const count = distribution[star] ?? 0;
        return (
          <View
            key={star}
            style={styles.row}
            accessible
            accessibilityLabel={t('stats.distribution.row', { star, count })}
          >
            <AppText variant="label" style={styles.star}>
              {star}
            </AppText>
            <View style={styles.bar}>
              <ProgressBar percent={(count / max) * 100} height={BAR_HEIGHT} />
            </View>
            <AppText variant="caption" align="right" style={styles.count}>
              {formatNumber(count)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 24 },
  star: { width: 16, textAlign: 'center' },
  bar: { flex: 1 },
  count: { minWidth: 36 },
}));

export const RatingDistribution = memo(RatingDistributionBase);
