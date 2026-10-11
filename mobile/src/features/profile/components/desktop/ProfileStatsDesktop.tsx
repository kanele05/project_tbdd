import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work';
import { AppText, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing, withAlpha } from '@/theme';
import type { MeStatsDto } from '@/types/api';

export type ProfileStatsDesktopProps = {
  stats: MeStatsDto | undefined;
  /** True while there is no number to show yet. */
  isLoading: boolean;
  onPressOngoing: () => void;
  onPressCompleted: () => void;
};

type StatTileProps = {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  /** When given the tile is a button (On Going / Completed open My Courses). */
  onPress?: () => void;
  testID: string;
};

function StatTile({ label, value, isLoading, onPress, testID }: StatTileProps) {
  const { t } = useTranslation('profile');
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const text = value == null ? '-' : formatNumber(value);
  const accessibilityLabel = `${label}, ${value == null ? t('stats.unavailable') : text}`;
  const content = (
    <>
      {isLoading ? (
        <Skeleton width={40} height={28} />
      ) : (
        <AppText variant="h2" color="white">
          {text}
        </AppText>
      )}
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.tile} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('stats.opensMyCourses')}
      style={[styles.tile, pointerStyle, isHovered ? styles.tileHover : null]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** Saved | On going | Completed as three glass tiles on the profile band (white text). */
export function ProfileStatsDesktop({
  stats,
  isLoading,
  onPressOngoing,
  onPressCompleted,
}: ProfileStatsDesktopProps) {
  const { t } = useTranslation('profile');
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="summary">
      <StatTile
        label={t('stats.saved')}
        value={stats?.savedCount}
        isLoading={isLoading}
        testID="profile-stat-saved"
      />
      <StatTile
        label={t('stats.ongoing')}
        value={stats?.ongoingCount}
        isLoading={isLoading}
        onPress={onPressOngoing}
        testID="profile-stat-ongoing"
      />
      <StatTile
        label={t('stats.completed')}
        value={stats?.completedCount}
        isLoading={isLoading}
        onPress={onPressCompleted}
        testID="profile-stat-completed"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: spacing.md },
  tile: {
    minWidth: 112,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.white, 0.22),
    backgroundColor: withAlpha(t.colors.white, 0.1),
  },
  tileHover: { backgroundColor: withAlpha(t.colors.white, 0.2) },
  label: { color: withAlpha(t.colors.white, 0.88) },
}));
