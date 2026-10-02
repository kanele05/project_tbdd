import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Skeleton } from '@/components/ui';
import { colors, spacing } from '@/theme';
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
  const text = value == null ? '-' : String(value);
  const content = (
    <>
      {isLoading ? (
        <Skeleton width={32} height={24} />
      ) : (
        <AppText variant="h3" align="center">
          {text}
        </AppText>
      )}
      <AppText variant="caption" align="center">
        {label}
      </AppText>
    </>
  );
  const accessibilityLabel = `${label}, ${value == null ? 'unavailable' : value}`;

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
      accessibilityHint="Opens My Courses"
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
  return (
    <View style={styles.row}>
      <StatColumn label="Save" value={stats?.savedCount} isLoading={isLoading} />
      <View style={styles.divider} />
      <StatColumn
        label="On Going"
        value={stats?.ongoingCount}
        isLoading={isLoading}
        onPress={onPressOngoing}
      />
      <View style={styles.divider} />
      <StatColumn
        label="Completed"
        value={stats?.completedCount}
        isLoading={isLoading}
        onPress={onPressCompleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  column: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  divider: { width: 1, height: 40, backgroundColor: colors.border },
});
