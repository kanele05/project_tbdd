import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

import { COURSE_CARD_VERTICAL_WIDTH } from './CourseCardVertical';

/** Loading placeholder with the same footprint as `CourseCardVertical`. */
export function CourseCardVerticalSkeleton({
  width = COURSE_CARD_VERTICAL_WIDTH,
}: {
  width?: number;
}) {
  const imageHeight = Math.round((width - 26) * (2 / 3));
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton height={imageHeight} borderRadius={radius.button} />
      <View style={styles.lines}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="55%" height={12} />
        <Skeleton width="30%" height={16} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

/** Loading placeholder with the same footprint as `CourseCardHorizontal`. */
export function CourseCardHorizontalSkeleton() {
  return (
    <View style={[styles.card, styles.row]}>
      <Skeleton width={96} height={96} borderRadius={radius.button} />
      <View style={styles.rowLines}>
        <Skeleton width="75%" height={16} />
        <Skeleton width="50%" height={12} />
        <Skeleton width="25%" height={16} />
        <Skeleton width="65%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  lines: { marginTop: spacing.md, gap: spacing.sm },
  rowLines: { flex: 1, justifyContent: 'center', gap: spacing.sm },
});
