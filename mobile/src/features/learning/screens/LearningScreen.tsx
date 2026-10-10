import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkButton } from '@/components/course/BookmarkButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { LessonAiPanel } from '@/features/ai/components/LessonAiPanel';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useCourseDetail } from '@/features/course/hooks';
import { ProjectsTab } from '@/features/project/components/ProjectsTab';
import { QaTab } from '@/features/qa/components/QaTab';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { CurriculumLesson } from '@/types/api';

import { useCourseAccessGuard } from '../accessGuard';
import { CourseInfo } from '../components/CourseInfo';
import { CurriculumList } from '../components/CurriculumList';
import { LessonListSkeleton } from '../components/LessonListSkeleton';
import { MiniPlayerBar } from '../components/MiniPlayerBar';
import { PlayerSlot } from '../components/PlayerSlot';
import {
  useActiveLesson,
  useCurriculum,
  useLesson,
  useShareCourse,
  useToggleCourseLike,
} from '../hooks';
import { useIsKeyboardVisible } from '../playerLayout';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '../queryStatus';
import { getShortCourseTitle } from '../videoUtils';

export type LearningScreenProps = { courseId: string };

type LearningTab = 'lessons' | 'projects' | 'qa';

/**
 * SC-15 Learning (M-20): the video of the current lesson (resume + progress saving), the course
 * title with like/share, and the Lessons | Projects | Q&A tabs. The lesson is the `lessonId`
 * param, else the enrollment's last lesson, else the first one. The Lessons tab opens with the AI
 * panel (ask the tutor, summarize, quiz). A 403 `NOT_ENROLLED` sends the user back to the course.
 */
export function LearningScreen({ courseId }: LearningScreenProps) {
  const { t } = useTranslation(['learning', 'ai']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { lessonId: paramLessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const course = useCourseDetail(courseId);
  const curriculum = useCurriculum(courseId);
  const { activeLessonId, selectLesson } = useActiveLesson({ paramLessonId, course, curriculum });
  const lesson = useLesson(activeLessonId);
  const [tab, setTab] = useState<LearningTab>('lessons');
  // Typing in Q&A on a small phone: the video folds into a one-line bar (it stays mounted, so it keeps playing).
  const isPlayerCollapsed = useIsKeyboardVisible() && tab !== 'lessons';

  useCourseAccessGuard(courseId, [lesson.error, curriculum.error]);

  const { toggleBookmark } = useToggleBookmark();
  const toggleLike = useToggleCourseLike(courseId).mutate;
  const { share } = useShareCourse(courseId, course.data?.title);

  const courseData = course.data;
  const handleToggleBookmark = useCallback(() => {
    if (courseData) toggleBookmark(courseId, courseData.isBookmarked);
  }, [courseData, courseId, toggleBookmark]);
  const handleToggleLike = useCallback(() => {
    if (courseData) toggleLike(courseData.isLiked);
  }, [courseData, toggleLike]);
  const handleExpandPlayer = useCallback(() => Keyboard.dismiss(), []);
  const handleShare = useCallback(() => void share(), [share]);
  const handleAskTutor = useCallback(() => {
    router.push({ pathname: '/learn/[courseId]/tutor', params: { courseId } });
  }, [courseId]);

  const handleLessonPress = useCallback(
    (pressed: CurriculumLesson) => {
      if (pressed.id !== activeLessonId) selectLesson(pressed.id);
    },
    [activeLessonId, selectLesson],
  );
  const handleEnded = useCallback(
    (nextLessonId: string | null) => {
      if (nextLessonId) selectLesson(nextLessonId);
    },
    [selectLesson],
  );
  const { refetch: refetchCourse } = course;
  const { refetch: refetchCurriculum } = curriculum;
  const { refetch: refetchLesson } = lesson;
  const handleRetryLesson = useCallback(() => {
    if (activeLessonId) void refetchLesson();
    else {
      void refetchCourse();
      void refetchCurriculum();
    }
  }, [activeLessonId, refetchCourse, refetchCurriculum, refetchLesson]);

  const tabs = useMemo<SegmentedTab<LearningTab>[]>(
    () => [
      { key: 'lessons', label: t('learning:tabs.lessons') },
      { key: 'projects', label: t('learning:tabs.projects') },
      { key: 'qa', label: t('learning:tabs.qa') },
    ],
    [t],
  );
  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        {courseData ? (
          <CourseInfo
            title={courseData.title}
            likeCount={courseData.likeCount}
            shareCount={courseData.shareCount}
            isLiked={courseData.isLiked}
            onToggleLike={handleToggleLike}
            onShare={handleShare}
          />
        ) : (
          <View style={styles.infoSkeleton}>
            <Skeleton width="85%" height={26} />
            <Skeleton width="40%" height={20} />
          </View>
        )}
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
      </View>
    ),
    [courseData, handleShare, handleToggleLike, styles, tab, tabs],
  );

  let lessons;
  if (isOfflineWithoutData(curriculum)) {
    lessons = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void refetchCurriculum()} />;
  } else if (curriculum.isPending) {
    lessons = <LessonListSkeleton />;
  } else if (curriculum.isError && !curriculum.data) {
    lessons = (
      <ErrorState
        error={curriculum.error}
        title={t('learning:loadLessonsFailed')}
        onRetry={() => void refetchCurriculum()}
      />
    );
  } else {
    lessons = (
      <CurriculumList
        sections={curriculum.data ?? []}
        activeLessonId={activeLessonId}
        onLessonPress={handleLessonPress}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader
        title={courseData ? getShortCourseTitle(courseData.title) : undefined}
        right={
          <View style={styles.headerActions}>
            <IconButton
              icon="message-circle"
              onPress={handleAskTutor}
              accessibilityLabel={t('ai:panel.ask')}
              color="primaryText"
              testID="header-ask-tutor"
            />
            <BookmarkButton
              isBookmarked={courseData?.isBookmarked ?? false}
              onPress={courseData ? handleToggleBookmark : undefined}
            />
          </View>
        }
      />
      {isPlayerCollapsed ? (
        <MiniPlayerBar title={lesson.data?.title} onExpand={handleExpandPlayer} />
      ) : null}
      <View
        style={[styles.player, isPlayerCollapsed ? styles.playerCollapsed : null]}
        accessibilityElementsHidden={isPlayerCollapsed}
        importantForAccessibility={isPlayerCollapsed ? 'no-hide-descendants' : 'auto'}
        testID="player-region"
      >
        <PlayerSlot
          courseId={courseId}
          activeLessonId={activeLessonId}
          lesson={lesson}
          course={course}
          curriculum={curriculum}
          onEnded={handleEnded}
          onRetry={handleRetryLesson}
        />
      </View>
      {tab === 'qa' ? (
        <QaTab courseId={courseId} header={header} />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View style={styles.tabContent}>
            {tab === 'lessons' ? (
              <>
                <LessonAiPanel
                  courseId={courseId}
                  lessonId={activeLessonId}
                  lessonTitle={lesson.data?.title}
                />
                {lessons}
              </>
            ) : (
              <ProjectsTab courseId={courseId} />
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  // No fixed height here: the MP4 player, the placeholder and the loading/error states are 16:9
  // boxes (capped at 35% of the window height), while the YouTube player is 16:9 plus its
  // source/attribution row - a fixed 16:9 slot made that row overlap the tabs.
  // Always dark, like a cinema screen, also in light mode.
  player: { backgroundColor: t.colors.scrim },
  // Zero height, not unmounted: the WebView / iframe keeps its state.
  playerCollapsed: { height: 0, overflow: 'hidden' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBlock: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xl,
  },
  infoSkeleton: { gap: spacing.md },
  tabContent: { gap: spacing.xl, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xl },
}));
