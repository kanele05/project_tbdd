import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `CourseProgressCard`. */
export function CourseProgressCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={96} height={96} borderRadius={radius.button} />
      <View style={styles.info}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
        <Skeleton width="35%" height={12} />
        <Skeleton height={4} borderRadius={radius.pill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.badge,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  info: { flex: 1, gap: spacing.sm },
});
