import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, spacing } from '@/theme';
import type { TeacherDetail } from '@/types/api';

export type TeacherStatsStripProps = { teacher: TeacherDetail };

/** Courses | Students | Rating | Followers in one hairline row under the hero. */
export function TeacherStatsStrip({ teacher }: TeacherStatsStripProps) {
  const { t } = useTranslation('teacher');
  const styles = useStyles();
  const stats = [
    { key: 'courses', label: t('stats.courses'), value: formatNumber(teacher.stats.courseCount) },
    {
      key: 'students',
      label: t('stats.students'),
      value: formatNumber(teacher.stats.studentCount),
    },
    {
      key: 'rating',
      label: t('stats.rating'),
      value: formatNumber(teacher.ratingAvg, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    },
    {
      key: 'followers',
      label: t('stats.followers'),
      value: formatNumber(teacher.stats.followerCount),
    },
  ];
  return (
    <View style={styles.row} accessibilityRole="summary" testID="teacher-stats">
      {stats.map((stat, index) => (
        <View
          key={stat.key}
          style={[styles.stat, index > 0 ? styles.divider : null]}
          accessible
          accessibilityLabel={t('stats.a11y', { label: stat.label, value: stat.value })}
        >
          <AppText variant="h2" numberOfLines={1}>
            {stat.value}
          </AppText>
          <AppText variant="caption" align="center" numberOfLines={1}>
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
    borderBottomWidth: 1,
    borderColor: t.colors.border,
    marginTop: spacing.xl,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.lg },
  divider: { borderLeftWidth: 1, borderLeftColor: t.colors.border },
}));
