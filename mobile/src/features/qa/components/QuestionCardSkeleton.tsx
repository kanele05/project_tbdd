import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `QuestionCard`. */
export function QuestionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={36} height={36} borderRadius={radius.pill} />
        <View style={styles.author}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="25%" height={12} />
        </View>
      </View>
      <Skeleton height={14} />
      <Skeleton width="75%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.badge,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { flex: 1, gap: spacing.sm },
});
