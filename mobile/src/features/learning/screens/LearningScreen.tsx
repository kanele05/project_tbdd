import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkButton } from '@/components/course/BookmarkButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useCourseDetail } from '@/features/course/hooks';
import { ProjectsTab } from '@/features/project/components/ProjectsTab';
import { QaTab } from '@/features/qa/components/QaTab';
import { getErrorMessage } from '@/lib/appError';
import { colors, layout, spacing } from '@/theme';
import type { CurriculumLesson } from '@/types/api';

import { useCourseAccessGuard } from '../accessGuard';
import { CourseInfo } from '../components/CourseInfo';
import { CurriculumList } from '../components/CurriculumList';
import { LessonListSkeleton } from '../components/LessonListSkeleton';
import { LessonPlayer } from '../components/LessonPlayer';
import { PlayerPlaceholder } from '../components/PlayerPlaceholder';
import {
  useActiveLesson,
  useCurriculum,
  useLesson,
  useShareCourse,
  useToggleCourseLike,
} from '../hooks';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '../queryStatus';
import { LEARNING_STRINGS } from '../strings';
import { getShortCourseTitle } from '../videoUtils';

export type LearningScreenProps = { courseId: string };

type LearningTab = 'lessons' | 'projects' | 'qa';

const TABS = [
  { key: 'lessons', label: LEARNING_STRINGS.lessonTabs.lessons },
  { key: 'projects', label: LEARNING_STRINGS.lessonTabs.projects },
  { key: 'qa', label: LEARNING_STRINGS.lessonTabs.qa },
] as const satisfies readonly { key: LearningTab; label: string }[];

/**
 * SC-15 Learning (M-20): the video of the current lesson (resume + progress saving), the course
 * title with like/share, and the LESSONS | PROJECTS | Q&A tabs. The lesson is the `lessonId`
 * param, else the enrollment's last lesson, else the first one. A 403 `NOT_ENROLLED` sends the
 * user back to the course details with a message.
 */
export function LearningScreen({ courseId }: LearningScreenProps) {
  const insets = useSafeAreaInsets();
  const { lessonId: paramLessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const course = useCourseDetail(courseId);
  const curriculum = useCurriculum(courseId);
  const { activeLessonId, selectLesson } = useActiveLesson({ paramLessonId, course, curriculum });
  const lesson = useLesson(activeLessonId);
  const [tab, setTab] = useState<LearningTab>('lessons');

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
  const handleShare = useCallback(() => void share(), [share]);

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
            <Skeleton width="85%" height={20} />
            <Skeleton width="40%" height={16} />
          </View>
        )}
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>
    ),
    [courseData, handleShare, handleToggleLike, tab],
  );

  let player;
  if (lesson.isSuccess && !lesson.isFetching) {
    player = (
      <LessonPlayer
        key={lesson.data.id}
        lesson={lesson.data}
        courseId={courseId}
        onEnded={handleEnded}
      />
    );
  } else if (
    isOfflineWithoutData(lesson) ||
    (activeLessonId === null && isOfflineWithoutData(course))
  ) {
    player = (
      <PlayerPlaceholder
        message={LEARNING_STRINGS.videoUnavailableOffline}
        onRetry={handleRetryLesson}
      />
    );
  } else if (lesson.isError) {
    player = (
      <PlayerPlaceholder message={getErrorMessage(lesson.error)} onRetry={handleRetryLesson} />
    );
  } else if (activeLessonId === null && (course.isError || curriculum.isError)) {
    player = (
      <PlayerPlaceholder
        message={getErrorMessage(course.error ?? curriculum.error)}
        onRetry={handleRetryLesson}
      />
    );
  } else {
    player = <PlayerPlaceholder />;
  }

  let lessons;
  if (isOfflineWithoutData(curriculum)) {
    lessons = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void refetchCurriculum()} />;
  } else if (curriculum.isPending) {
    lessons = <LessonListSkeleton />;
  } else if (curriculum.isError && !curriculum.data) {
    lessons = (
      <ErrorState
        error={curriculum.error}
        title={LEARNING_STRINGS.loadLessonsFailed}
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={courseData ? getShortCourseTitle(courseData.title) : undefined}
        right={
          <View style={styles.headerActions}>
            <BookmarkButton
              isBookmarked={courseData?.isBookmarked ?? false}
              onPress={courseData ? handleToggleBookmark : undefined}
            />
            <IconButton
              icon="more-vertical"
              onPress={handleShare}
              accessibilityLabel={LEARNING_STRINGS.moreActions}
              color="textPrimary"
            />
          </View>
        }
      />
      <View style={styles.player}>{player}</View>
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
            {tab === 'lessons' ? lessons : <ProjectsTab courseId={courseId} />}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  player: { aspectRatio: 16 / 9, backgroundColor: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerBlock: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.lg,
  },
  infoSkeleton: { gap: spacing.md },
  tabContent: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm },
});
