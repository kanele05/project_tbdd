import { StyleSheet, View } from 'react-native';

import { CourseCardVerticalSkeleton } from '@/components/course/CourseCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, layout, radius, spacing } from '@/theme';

/** SC-18 loading state: cover, avatar, name/job/place lines and the tab bar. */
export function TeacherProfileSkeleton() {
  return (
    <View style={styles.profile} testID="teacher-profile-skeleton">
      <Skeleton height={128} />
      <View style={styles.identity}>
        <Skeleton width={96} height={96} borderRadius={radius.pill} />
        <Skeleton width={160} height={24} />
        <Skeleton width={110} height={16} />
        <Skeleton width={140} height={16} />
      </View>
      <Skeleton height={48} style={styles.tabs} />
    </View>
  );
}

/** Courses tab loading state: one group title + a row of card skeletons. */
export function TeacherCoursesSkeleton() {
  return (
    <View style={styles.courses} testID="teacher-courses-skeleton">
      <Skeleton width={140} height={24} style={styles.padded} />
      <View style={styles.row}>
        <CourseCardVerticalSkeleton />
        <CourseCardVerticalSkeleton />
      </View>
    </View>
  );
}

/** Review tab loading state: three review-card shaped blocks. */
export function TeacherReviewsSkeleton() {
  return (
    <View style={styles.reviews} testID="teacher-reviews-skeleton">
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.review}>
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

const styles = StyleSheet.create({
  profile: { paddingHorizontal: layout.screenPaddingX },
  identity: { alignItems: 'center', gap: spacing.sm, marginTop: -48, marginBottom: spacing.xl },
  tabs: { borderRadius: 0 },
  courses: { gap: spacing.md, paddingVertical: spacing.xl },
  padded: { marginHorizontal: layout.screenPaddingX },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: layout.screenPaddingX },
  reviews: { gap: spacing.md, padding: layout.screenPaddingX },
  review: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.backgroundAlt,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewLines: { flex: 1, gap: spacing.xs },
  teacherCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  teacherCardLines: { gap: spacing.sm, marginTop: spacing.md },
});

/** SC-19 loading state: placeholder with the footprint of `TeacherCard`. */
export function TeacherCardSkeleton() {
  return (
    <View style={styles.teacherCard} testID="teacher-card-skeleton">
      <Skeleton height={Math.round(126 * 0.75)} borderRadius={radius.button} />
      <View style={styles.teacherCardLines}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={12} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}
