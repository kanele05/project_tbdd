import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardVertical, CourseCardVerticalSkeleton } from '@/components/course';
import { AppText, Button, RailList, SectionHeader } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { useSimilarCourses } from '../hooks';

export type SimilarCoursesProps = { courseId: string };

const SKELETON_KEYS = ['a', 'b', 'c'] as const;
const keyOfCourse = (course: CourseSummary): string => course.id;

/** Overview "Similar courses": a rail of up to 3 poster cards (hidden when there are none). */
export function SimilarCourses({ courseId }: SimilarCoursesProps) {
  const { t } = useTranslation(['course', 'common']);
  const { data, isPending, isError, refetch } = useSimilarCourses(courseId);
  const { toggleBookmark } = useToggleBookmark();

  const handlePress = useCallback((course: CourseSummary) => {
    router.push(`/course/${course.id}`);
  }, []);
  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked, course),
    [toggleBookmark],
  );
  const renderCourse = useCallback(
    (course: CourseSummary) => (
      <CourseCardVertical
        course={course}
        onPress={handlePress}
        onToggleBookmark={handleToggleBookmark}
      />
    ),
    [handlePress, handleToggleBookmark],
  );

  if (isPending) {
    return (
      <RailList
        title={t('course:similar.title')}
        data={SKELETON_KEYS}
        keyExtractor={(key) => key}
        renderItem={() => <CourseCardVerticalSkeleton />}
      />
    );
  }
  if (isError) {
    return (
      <View style={styles.padded}>
        <SectionHeader title={t('course:similar.title')} />
        <View style={styles.error}>
          <AppText variant="body" color="textSecondary" style={styles.errorText}>
            {t('course:similar.failed')}
          </AppText>
          <Button
            title={t('common:actions.retry')}
            variant="ghost"
            size="sm"
            onPress={() => void refetch()}
          />
        </View>
      </View>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <RailList
      title={t('course:similar.title')}
      data={data}
      keyExtractor={keyOfCourse}
      renderItem={renderCourse}
    />
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: layout.screenPaddingX, gap: spacing.sm },
  error: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { flex: 1 },
});
