import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { makeStyles, radius, spacing } from '@/theme';

/** Loading placeholder shaped like a `QuestionCard`. */
export function QuestionCardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={radius.pill} />
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

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.sm },
}));
