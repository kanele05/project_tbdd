import { type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { formatFixed, formatNumber } from '@/i18n/format';
import type { TeacherCourseStatsDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { StatTile } from './StatTile';

export type StatsKpisProps = {
  stats: TeacherCourseStatsDto;
  /** Applied to each of the four tiles. */
  tileStyle?: StyleProp<ViewStyle>;
};

/** The four KPI tiles of SC-28: students, revenue, average progress and rating. */
export function StatsKpis({ stats, tileStyle }: StatsKpisProps) {
  const { t } = useTranslation('teaching');
  return (
    <>
      <StatTile
        label={t('stats.kpi.students')}
        value={formatNumber(stats.enrollmentCount)}
        note={t('stats.kpi.completed', { count: stats.completedCount })}
        style={tileStyle}
        testID="kpi-students"
      />
      <StatTile
        label={t('stats.kpi.revenue')}
        value={formatPrice(stats.revenueCents)}
        note={t('stats.kpi.revenueNote')}
        style={tileStyle}
        testID="kpi-revenue"
      />
      <StatTile
        label={t('stats.kpi.avgProgress')}
        value={`${formatNumber(stats.avgProgressPercent)}%`}
        style={tileStyle}
        testID="kpi-progress"
      />
      <StatTile
        label={t('stats.kpi.rating')}
        value={
          stats.ratingCount > 0
            ? t('stats.kpi.ratingValue', { rating: formatFixed(stats.ratingAvg, 1) })
            : '-'
        }
        note={
          stats.ratingCount > 0
            ? t('stats.kpi.reviews', { count: stats.ratingCount })
            : t('stats.kpi.noRating')
        }
        style={tileStyle}
        testID="kpi-rating"
      />
    </>
  );
}
