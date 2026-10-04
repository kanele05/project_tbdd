import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { makeStyles, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `ReviewCard`. */
export function ReviewCardSkeleton() {
  const themed = useStyles();
  return (
    <View style={themed.card}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={radius.pill} />
        <View style={styles.author}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="25%" height={12} />
        </View>
      </View>
      <View style={styles.lines}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
}));

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.sm },
  lines: { gap: spacing.sm },
});
