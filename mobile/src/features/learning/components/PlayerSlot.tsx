import type { UseQueryResult } from '@tanstack/react-query';

import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import type { CourseDetail, CurriculumSection, LessonDetail } from '@/types/api';

import { isOfflineWithoutData } from '../queryStatus';
import { LessonPlayer } from './LessonPlayer';
import { PlayerPlaceholder } from './PlayerPlaceholder';

export type PlayerSlotProps = {
  courseId: string;
  activeLessonId: string | null;
  lesson: UseQueryResult<LessonDetail>;
  course: UseQueryResult<CourseDetail>;
  curriculum: UseQueryResult<CurriculumSection[]>;
  onEnded: (nextLessonId: string | null) => void;
  onRetry: () => void;
};

/**
 * The 16:9 video slot of the Learning screen: the player once the lesson is loaded, otherwise a
 * dark placeholder that says why (loading, offline, error) and offers Retry.
 */
export function PlayerSlot({
  courseId,
  activeLessonId,
  lesson,
  course,
  curriculum,
  onEnded,
  onRetry,
}: PlayerSlotProps) {
  const { t } = useTranslation('learning');
  if (lesson.isSuccess && !lesson.isFetching) {
    return (
      <LessonPlayer
        key={lesson.data.id}
        lesson={lesson.data}
        courseId={courseId}
        onEnded={onEnded}
      />
    );
  }
  if (isOfflineWithoutData(lesson) || (activeLessonId === null && isOfflineWithoutData(course))) {
    return <PlayerPlaceholder message={t('videoUnavailableOffline')} onRetry={onRetry} />;
  }
  if (lesson.isError) {
    return <PlayerPlaceholder message={getErrorMessage(lesson.error)} onRetry={onRetry} />;
  }
  if (activeLessonId === null && (course.isError || curriculum.isError)) {
    return (
      <PlayerPlaceholder
        message={getErrorMessage(course.error ?? curriculum.error)}
        onRetry={onRetry}
      />
    );
  }
  return <PlayerPlaceholder />;
}
