import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMeStats } from '@/features/profile/hooks';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { formatLearningTime } from '../formatLearningTime';

type StatChipProps = {
  icon: FeatherIconName;
  value: string | undefined;
  label: string;
  testID: string;
};

function StatChip({ icon, value, label, testID }: StatChipProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.chip}
      accessible
      accessibilityLabel={`${label}: ${value ?? '-'}`}
      testID={testID}
    >
      <Feather name={icon} size={16} color={colors.primaryText} />
      {value === undefined ? (
        <Skeleton width={36} height={16} />
      ) : (
        <AppText variant="label" family="bodyBold">
          {value}
        </AppText>
      )}
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

/**
 * The stat chips under the My Courses title (desktop): courses in progress, completed and the total
 * time learned. Nothing is drawn when the stats could not be loaded (they are only decoration).
 */
export function MyCoursesStats() {
  const { t } = useTranslation('myCourses');
  const stats = useMeStats();
  const styles = useStyles();
  const data = stats.data;
  if (!data && !stats.isPending) return null;
  return (
    <View style={styles.row} testID="my-courses-stats">
      <StatChip
        icon="play-circle"
        value={data ? formatNumber(data.ongoingCount) : undefined}
        label={t('stats.ongoing')}
        testID="stat-ongoing"
      />
      <StatChip
        icon="check-circle"
        value={data ? formatNumber(data.completedCount) : undefined}
        label={t('stats.completed')}
        testID="stat-completed"
      />
      <StatChip
        icon="clock"
        value={data ? formatLearningTime(data.learningSec) : undefined}
        label={t('stats.learning')}
        testID="stat-learning"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));
