import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { layout, makeStyles, spacing } from '@/theme';
import { formatTotalHours } from '@/utils/formatDuration';

export type CourseStatsProps = {
  lessonCount: number;
  totalDurationSec: number;
  likeCount: number;
};

type Stat = { key: string; value: string; label: string };

/** The three facts under the teacher row: lessons, total length and likes, between two hairlines. */
function CourseStatsBase({ lessonCount, totalDurationSec, likeCount }: CourseStatsProps) {
  const { t } = useTranslation('course');
  const styles = useStyles();
  const stats: Stat[] = [
    { key: 'lessons', value: formatNumber(lessonCount), label: t('stats.lessons') },
    { key: 'duration', value: formatTotalHours(totalDurationSec), label: t('stats.duration') },
    { key: 'likes', value: formatNumber(likeCount), label: t('stats.likes') },
  ];
  return (
    <View style={styles.row}>
      {stats.map((stat, index) => (
        <View
          key={stat.key}
          style={[styles.stat, index > 0 ? styles.divider : null]}
          accessible
          accessibilityLabel={t('stats.a11y', { value: stat.value, label: stat.label })}
        >
          <AppText
            variant="h2"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            align="center"
          >
            {stat.value}
          </AppText>
          <AppText variant="caption" numberOfLines={2} align="center">
            {stat.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    marginHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: t.colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.lg },
  divider: { borderLeftWidth: 1, borderLeftColor: t.colors.border },
}));

export const CourseStats = memo(CourseStatsBase);
