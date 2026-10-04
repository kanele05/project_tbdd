import { Pressable, View } from 'react-native';

import { AppText, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { layout, makeStyles } from '@/theme';
import type { MeStatsDto } from '@/types/api';

type ProfileStatsProps = {
  stats: MeStatsDto | undefined;
  /** True while there is no number to show yet. */
  isLoading: boolean;
  onPressOngoing: () => void;
  onPressCompleted: () => void;
};

type StatColumnProps = {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  /** When given the column is a button (On Going / Completed -> My Courses). */
  onPress?: () => void;
};

function StatColumn({ label, value, isLoading, onPress }: StatColumnProps) {
  const { t } = useTranslation('profile');
  const styles = useStyles();
  const text = value == null ? '-' : formatNumber(value);
  const content = (
    <>
      {isLoading ? (
        <Skeleton width={32} height={24} />
      ) : (
        <AppText variant="h3" align="center">
          {text}
        </AppText>
      )}
      <AppText variant="micro" family="body" color="textMuted" align="center" style={styles.label}>
        {label}
      </AppText>
    </>
  );
  const accessibilityLabel = `${label}, ${value == null ? t('stats.unavailable') : text}`;

  if (!onPress) {
    return (
      <View style={styles.column} accessible accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('stats.opensMyCourses')}
      style={({ pressed }) => [styles.column, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

/** Save | On Going | Completed counters with vertical dividers (SC-20, BR-15). */
export function ProfileStats({
  stats,
  isLoading,
  onPressOngoing,
  onPressCompleted,
}: ProfileStatsProps) {
  const { t } = useTranslation('profile');
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <StatColumn label={t('stats.saved')} value={stats?.savedCount} isLoading={isLoading} />
      <View style={styles.divider} />
      <StatColumn
        label={t('stats.ongoing')}
        value={stats?.ongoingCount}
        isLoading={isLoading}
        onPress={onPressOngoing}
      />
      <View style={styles.divider} />
      <StatColumn
        label={t('stats.completed')}
        value={stats?.completedCount}
        isLoading={isLoading}
        onPress={onPressCompleted}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  column: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Design: the 10 px label sits right below the number; 11 px keeps it legible.
  label: { lineHeight: 16 },
  pressed: { opacity: 0.6 },
  divider: { width: 1, height: 44, backgroundColor: t.colors.borderSubtle },
}));
