import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing } from '@/theme';
import type { StudioListSummaryDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

export type StudioSummaryTilesProps = { summary: StudioListSummaryDto };

/** Three totals of the Studio list: courses, students and (simulated) revenue. */
export function StudioSummaryTiles({ summary }: StudioSummaryTilesProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const tiles = [
    { key: 'courses', value: formatNumber(summary.courseCount), label: t('summary.courses') },
    {
      key: 'students',
      value: formatNumber(summary.totalEnrollments),
      label: t('summary.students'),
    },
    { key: 'revenue', value: formatPrice(summary.totalRevenueCents), label: t('summary.revenue') },
  ];
  return (
    <View style={styles.tiles} testID="studio-summary">
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={styles.tile}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}`}
        >
          <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {tile.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));
