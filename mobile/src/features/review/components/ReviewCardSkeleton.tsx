import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `ReviewCard`. */
export function ReviewCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={36} height={36} borderRadius={radius.pill} />
        <View style={styles.author}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="25%" height={12} />
        </View>
      </View>
      <View style={styles.lines}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.backgroundAlt,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { flex: 1, gap: spacing.sm },
  lines: { gap: spacing.sm },
});
