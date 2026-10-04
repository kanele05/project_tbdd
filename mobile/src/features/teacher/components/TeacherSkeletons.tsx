import { StyleSheet, View } from 'react-native';

import { CourseCardVerticalSkeleton } from '@/components/course/CourseCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { layout, makeStyles, radius, spacing } from '@/theme';

/** SC-18 loading state: hero, the four numbers and the tab bar. */
export function TeacherProfileSkeleton() {
  return (
    <View testID="teacher-profile-skeleton">
      <Skeleton height={400} borderRadius={0} />
      <View style={styles.profile}>
        <Skeleton height={72} />
        <Skeleton height={52} borderRadius={radius.pill} />
        <Skeleton height={48} />
      </View>
    </View>
  );
}

/** Courses tab loading state: one group title + a row of card skeletons. */
export function TeacherCoursesSkeleton() {
  return (
    <View style={styles.courses} testID="teacher-courses-skeleton">
      <Skeleton width={140} height={28} style={styles.padded} />
      <View style={styles.row}>
        <CourseCardVerticalSkeleton />
        <CourseCardVerticalSkeleton />
      </View>
    </View>
  );
}

/** Reviews tab loading state: three review-card shaped blocks. */
export function TeacherReviewsSkeleton() {
  const themed = useStyles();
  return (
    <View style={styles.reviews} testID="teacher-reviews-skeleton">
      {[0, 1, 2].map((key) => (
        <View key={key} style={themed.review}>
          <View style={styles.reviewHead}>
            <Skeleton width={40} height={40} borderRadius={radius.pill} />
            <View style={styles.reviewLines}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="30%" height={12} />
            </View>
          </View>
          <Skeleton width="90%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      ))}
    </View>
  );
}

/** SC-19 loading state: placeholder with the footprint of the portrait `TeacherCard`. */
export function TeacherCardSkeleton() {
  const themed = useStyles();
  return <View style={themed.card} testID="teacher-card-skeleton" />;
}

const useStyles = makeStyles((t) => ({
  card: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    backgroundColor: t.colors.skeleton,
  },
  review: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
}));

const styles = StyleSheet.create({
  profile: { gap: spacing.lg, padding: layout.screenPaddingX },
  courses: { gap: spacing.md, paddingTop: layout.sectionGap },
  padded: { marginHorizontal: layout.screenPaddingX },
  row: { flexDirection: 'row', gap: layout.railGap, paddingHorizontal: layout.screenPaddingX },
  reviews: { gap: spacing.md, padding: layout.screenPaddingX },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewLines: { flex: 1, gap: spacing.xs },
});
