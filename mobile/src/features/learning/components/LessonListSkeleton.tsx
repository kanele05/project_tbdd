import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

const ROWS = [0, 1, 2] as const;

/** Loading placeholder of the curriculum: a chapter title and three lesson rows. */
export function LessonListSkeleton() {
  const { t } = useTranslation('learning');
  return (
    <View
      style={styles.container}
      accessibilityLabel={t('loadingLessons')}
      accessibilityState={{ busy: true }}
      accessible
    >
      <Skeleton width="55%" height={20} />
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton width={20} height={16} />
          <View style={styles.texts}>
            <Skeleton width="80%" height={16} />
            <Skeleton width={72} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: spacing.sm },
});
