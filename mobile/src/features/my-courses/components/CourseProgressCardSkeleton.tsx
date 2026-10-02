import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `CourseProgressCard`. */
export function CourseProgressCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={96} height={96} borderRadius={radius.button} />
      <View style={styles.info}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={14} />
        <Skeleton width="35%" height={14} />
        <Skeleton height={6} borderRadius={radius.pill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, justifyContent: 'center', gap: spacing.sm },
});
