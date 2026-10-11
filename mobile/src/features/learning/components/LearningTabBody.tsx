import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { LessonAiPanel } from '@/features/ai/components/LessonAiPanel';
import { ProjectsTab } from '@/features/project/components/ProjectsTab';
import { QaTab } from '@/features/qa/components/QaTab';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { CurriculumLesson, CurriculumSection } from '@/types/api';

import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '../queryStatus';
import { CurriculumList } from './CurriculumList';
import { LessonListSkeleton } from './LessonListSkeleton';

export type LearningTab = 'lessons' | 'projects' | 'qa';

export type LearningTabBodyProps = {
  courseId: string;
  tab: LearningTab;
  /** Tabs row (and, on a phone, the course info above it): scrolls with the content. */
  header: ReactElement;
  curriculum: UseQueryResult<CurriculumSection[]>;
  activeLessonId: string | null;
  lessonTitle: string | undefined;
  onLessonPress: (lesson: CurriculumLesson) => void;
  /** Space kept under the scrolling content (safe-area bottom inset + gap). */
  bottomPadding: number;
};

/**
 * The area under the Learning tabs: Lessons (AI panel + curriculum with its four data states),
 * Projects or Q&A. Q&A is its own list (the composer is pinned to the bottom of the area); the
 * other two scroll in a ScrollView. On a PC window this fills the right-hand panel, scrolling on
 * its own.
 */
export function LearningTabBody({
  courseId,
  tab,
  header,
  curriculum,
  activeLessonId,
  lessonTitle,
  onLessonPress,
  bottomPadding,
}: LearningTabBodyProps) {
  const { t } = useTranslation('learning');
  const styles = useStyles();
  const { refetch } = curriculum;

  if (tab === 'qa') return <QaTab courseId={courseId} header={header} />;

  let lessons;
  if (isOfflineWithoutData(curriculum)) {
    lessons = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void refetch()} />;
  } else if (curriculum.isPending) {
    lessons = <LessonListSkeleton />;
  } else if (curriculum.isError && !curriculum.data) {
    lessons = (
      <ErrorState
        error={curriculum.error}
        title={t('loadLessonsFailed')}
        onRetry={() => void refetch()}
      />
    );
  } else {
    lessons = (
      <CurriculumList
        sections={curriculum.data ?? []}
        activeLessonId={activeLessonId}
        onLessonPress={onLessonPress}
      />
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={styles.tabContent}>
        {tab === 'lessons' ? (
          <>
            <LessonAiPanel
              courseId={courseId}
              lessonId={activeLessonId}
              lessonTitle={lessonTitle}
            />
            {lessons}
          </>
        ) : (
          <ProjectsTab courseId={courseId} />
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  tabContent: { gap: spacing.xl, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xl },
}));
