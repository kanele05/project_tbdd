import { memo, useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { TeacherCourseStatsDto } from '@/types/api';

export type EnrollmentsChartProps = {
  /** One entry per UTC day, oldest first (the stats endpoint sends exactly 30). */
  days: TeacherCourseStatsDto['newEnrollments30d'];
};

const CHART_HEIGHT = 120;
const BAR_GAP = 2;
/** A day with students never draws shorter than this, so a single student stays visible. */
const MIN_BAR_HEIGHT = 4;
/** An empty day keeps a hairline on the baseline. */
const EMPTY_BAR_HEIGHT = 2;
const FALLBACK_WIDTH = 300;

/** The busiest day of the series ("2026-10-05" + 7), or `null` when nobody enrolled. */
export function getPeakDay(days: EnrollmentsChartProps['days']) {
  let peak: { date: string; count: number } | null = null;
  for (const day of days) {
    if (day.count > 0 && (peak === null || day.count > peak.count)) peak = day;
  }
  return peak;
}

function formatDay(date: string): string {
  return formatDate(`${date}T00:00:00Z`, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * 30-day "new students" bar chart drawn with `react-native-svg` (SC-28). It is one accessible
 * element with a text summary - the individual bars are decorative.
 */
function EnrollmentsChartBase({ days }: EnrollmentsChartProps) {
  const { t } = useTranslation('teaching');
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next > 0) setWidth(next);
  }, []);

  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = getPeakDay(days);
  if (total === 0 || days.length === 0) {
    return (
      <AppText variant="body" color="textSecondary" testID="enrollments-chart-empty">
        {t('stats.chart.empty')}
      </AppText>
    );
  }

  const barWidth = Math.max(1, (width - BAR_GAP * (days.length - 1)) / days.length);
  const maxCount = peak?.count ?? 1;
  const label = t('stats.chart.a11y', {
    total,
    peak: peak?.count ?? 0,
    date: peak ? formatDay(peak.date) : '',
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="enrollments-chart"
    >
      <View onLayout={handleLayout}>
        <Svg width={width} height={CHART_HEIGHT} accessibilityElementsHidden>
          {days.map((day, index) => {
            const height =
              day.count > 0
                ? Math.max(MIN_BAR_HEIGHT, (day.count / maxCount) * CHART_HEIGHT)
                : EMPTY_BAR_HEIGHT;
            return (
              <Rect
                key={day.date}
                x={index * (barWidth + BAR_GAP)}
                y={CHART_HEIGHT - height}
                width={barWidth}
                height={height}
                rx={Math.min(2, barWidth / 2)}
                fill={day.count > 0 ? colors.primary : colors.border}
              />
            );
          })}
        </Svg>
      </View>
      <View style={styles.axis}>
        <AppText variant="caption">{t('stats.chart.axisStart')}</AppText>
        <AppText variant="caption">{t('stats.chart.axisEnd')}</AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
}));

export const EnrollmentsChart = memo(EnrollmentsChartBase);
