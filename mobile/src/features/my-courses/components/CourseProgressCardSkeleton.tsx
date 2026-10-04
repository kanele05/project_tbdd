import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { makeStyles, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `CourseProgressCard`. */
export function CourseProgressCardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Skeleton width={96} height={96} borderRadius={radius.button} />
      <View style={styles.info}>
        <Skeleton width="75%" height={16} />
        <Skeleton width="45%" height={12} />
        <Skeleton width="35%" height={12} />
        <Skeleton height={4} borderRadius={radius.pill} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  info: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
}));
