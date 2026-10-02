import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardHorizontal, CourseCardHorizontalSkeleton } from '@/components/course';
import { AppText, Button } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { useSimilarCourses } from '../hooks';

export type SimilarCoursesProps = { courseId: string };

/** Overview tab "Similar courses": up to 3 horizontal cards stacked vertically (design). */
export function SimilarCourses({ courseId }: SimilarCoursesProps) {
  const { data, isPending, isError, refetch } = useSimilarCourses(courseId);
  const { toggleBookmark } = useToggleBookmark();

  const handlePress = useCallback((course: CourseSummary) => {
    router.push(`/course/${course.id}`);
  }, []);
  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked, course),
    [toggleBookmark],
  );

  if (!isPending && !isError && (data?.length ?? 0) === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title" accessibilityRole="header">
        Similar courses
      </AppText>
      {isPending ? (
        <>
          <CourseCardHorizontalSkeleton />
          <CourseCardHorizontalSkeleton />
        </>
      ) : null}
      {isError ? (
        <View style={styles.error}>
          <AppText variant="body" color="textSecondary">
            {"Couldn't load similar courses."}
          </AppText>
          <Button title="Retry" variant="ghost" size="sm" onPress={() => void refetch()} />
        </View>
      ) : null}
      {data?.map((course) => (
        <CourseCardHorizontal
          key={course.id}
          course={course}
          onPress={handlePress}
          onToggleBookmark={handleToggleBookmark}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  error: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
