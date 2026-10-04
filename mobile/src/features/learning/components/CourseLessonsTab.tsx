import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toast';
import { useCourseDetail } from '@/features/course/hooks';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CurriculumLesson, CurriculumSection } from '@/types/api';

import { useCurriculum } from '../hooks';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '../queryStatus';
import { CurriculumList } from './CurriculumList';
import { LessonListSkeleton } from './LessonListSkeleton';

export type CourseLessonsTabProps = {
  courseId: string;
  /** Tap on a preview lesson while not enrolled → parent plays the preview video. */
  onPlayPreview?: (lessonId: string) => void;
};

function hasLockedLesson(sections: readonly CurriculumSection[]): boolean {
  return sections.some((section) => section.lessons.some((lesson) => lesson.status === 'LOCKED'));
}

/**
 * SC-09 "LESSONS" tab (M-14 / M-14b): the curriculum with the four BR-02 states.
 * - 🔒 locked → toast "Enroll to unlock this lesson";
 * - not enrolled + preview → `onPlayPreview(lessonId)` (the parent owns the player modal);
 * - enrolled → the Learning screen at that lesson.
 */
export function CourseLessonsTab({ courseId, onPlayPreview }: CourseLessonsTabProps) {
  const { t } = useTranslation('learning');
  const toast = useToast();
  const curriculum = useCurriculum(courseId);
  const course = useCourseDetail(courseId);
  const sections = curriculum.data;

  // The course detail is the source of truth; before it arrives, "no locked lesson" means enrolled.
  const isEnrolled = course.data
    ? course.data.enrollment !== null
    : sections !== undefined && !hasLockedLesson(sections);

  const handleLessonPress = useCallback(
    (lesson: CurriculumLesson) => {
      if (lesson.status === 'LOCKED') {
        toast.info(t('lockedLesson'));
        return;
      }
      if (isEnrolled) {
        router.push({ pathname: '/learn/[courseId]', params: { courseId, lessonId: lesson.id } });
        return;
      }
      onPlayPreview?.(lesson.id);
    },
    [courseId, isEnrolled, onPlayPreview, t, toast],
  );

  if (isOfflineWithoutData(curriculum)) {
    return (
      <View style={styles.container}>
        <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void curriculum.refetch()} />
      </View>
    );
  }
  if (curriculum.isPending) {
    return (
      <View style={styles.container}>
        <LessonListSkeleton />
      </View>
    );
  }
  if (curriculum.isError && !sections) {
    return (
      <View style={styles.container}>
        <ErrorState
          error={curriculum.error}
          title={t('loadLessonsFailed')}
          onRetry={() => void curriculum.refetch()}
        />
      </View>
    );
  }
  if (!sections || sections.every((section) => section.lessons.length === 0)) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="play-circle"
          title={t('noLessonsTitle')}
          message={t('noLessonsMessage')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CurriculumList sections={sections} onLessonPress={handleLessonPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The first chapter title sits 20 dp under the tabs: the course screen's `tabContent` adds it.
  container: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
});
