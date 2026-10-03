import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { layout, spacing } from '@/theme';

/** Loading placeholder of SC-09 (hero, title, rating, tabs and a few content rows). */
export function CourseDetailSkeleton() {
  return (
    <View testID="course-detail-skeleton" accessibilityLabel="Loading course">
      <View style={styles.heroWrap}>
        <Skeleton height={243} borderRadius={0} />
      </View>
      <View style={styles.body}>
        <Skeleton width="90%" height={20} />
        <Skeleton width="60%" height={20} />
        <Skeleton width="45%" height={14} />
        <Skeleton height={48} style={styles.tabs} />
        <View style={styles.teacherRow}>
          <Skeleton width={36} height={36} borderRadius={18} />
          <View style={styles.teacherTexts}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { width: '100%' },
  body: { padding: layout.screenPaddingX, gap: spacing.md },
  tabs: { marginVertical: spacing.sm },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teacherTexts: { flex: 1, gap: spacing.sm },
});
