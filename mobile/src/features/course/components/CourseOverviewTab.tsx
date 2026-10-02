import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useToggleFollow } from '@/features/teacher/hooks';
import { spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

import { buildBenefits } from '../courseAction';
import { BenefitsList } from './BenefitsList';
import { ExpandableText } from './ExpandableText';
import { SimilarCourses } from './SimilarCourses';
import { TeacherRow } from './TeacherRow';

export type CourseOverviewTabProps = { course: CourseDetail };

/** SC-09 Overview tab: teacher row, description (4 lines + See more), benefits, similar courses. */
export function CourseOverviewTab({ course }: CourseOverviewTabProps) {
  const { toggleFollow } = useToggleFollow();
  const { teacher } = course;
  const benefits = useMemo(
    () => buildBenefits({ benefits: course.benefits, totalDurationSec: course.totalDurationSec }),
    [course.benefits, course.totalDurationSec],
  );

  const handleOpenTeacher = useCallback(() => router.push(`/teacher/${teacher.id}`), [teacher.id]);
  const handleToggleFollow = useCallback(
    () => toggleFollow(teacher.id, teacher.isFollowed),
    [toggleFollow, teacher.id, teacher.isFollowed],
  );

  return (
    <View style={styles.container}>
      <TeacherRow
        teacher={teacher}
        onOpenTeacher={handleOpenTeacher}
        onToggleFollow={handleToggleFollow}
      />
      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          Description
        </AppText>
        <ExpandableText text={course.description} />
      </View>
      {benefits.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title" accessibilityRole="header">
            Benefits
          </AppText>
          <BenefitsList benefits={benefits} />
        </View>
      ) : null}
      <SimilarCourses courseId={course.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxl },
  section: { gap: spacing.md },
});
