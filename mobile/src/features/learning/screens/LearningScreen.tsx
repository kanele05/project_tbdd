import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkButton } from '@/components/course/BookmarkButton';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useCourseDetail } from '@/features/course/hooks';
import { autoScrollStyle } from '@/features/course/webStyles';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { CurriculumLesson } from '@/types/api';

import { useCourseAccessGuard } from '../accessGuard';
import { CourseInfo } from '../components/CourseInfo';
import { DesktopLessonInfo } from '../components/DesktopLessonInfo';
import { LearningTabBody, type LearningTab } from '../components/LearningTabBody';
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
import { getShortCourseTitle } from '../videoUtils';

/** Width of the Lessons / Q&A / Projects panel on a PC window (PLAN §2.5). */
const PANEL_WIDTH_DESKTOP = 400;
const PANEL_WIDTH_TABLET = 340;

export type LearningScreenProps = { courseId: string };

/** `?tab=projects` (a PROJECT_GRADED notification) opens that tab; anything else starts on Lessons. */
function parseLearningTab(value: string | undefined): LearningTab {
  return value === 'projects' || value === 'qa' ? value : 'lessons';
}

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
  const { isWide, isDesktop } = useBreakpoint();
  const { lessonId: paramLessonId, tab: paramTab } = useLocalSearchParams<{
    lessonId?: string;
    tab?: string;
  }>();
  const course = useCourseDetail(courseId);
  const curriculum = useCurriculum(courseId);
  const { activeLessonId, selectLesson } = useActiveLesson({ paramLessonId, course, curriculum });
  const lesson = useLesson(activeLessonId);
  const [tab, setTab] = useState<LearningTab>(() => parseLearningTab(paramTab));
  // Typing in Q&A on a small phone: the video folds into a one-line bar (it stays mounted, so it keeps playing).
  // Never on a PC window: the video and the tabs sit side by side there.
  const isPlayerCollapsed = useIsKeyboardVisible() && tab !== 'lessons' && !isWide;

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
  const { refetch: refetchLesson } = lesson;
  const handleRetryLesson = useCallback(() => {
    if (activeLessonId) void refetchLesson();
    else {
      void refetchCourse();
      void curriculum.refetch();
    }
  }, [activeLessonId, curriculum, refetchCourse, refetchLesson]);

  const tabs = useMemo<SegmentedTab<LearningTab>[]>(
    () => [
      { key: 'lessons', label: t('learning:tabs.lessons') },
      { key: 'projects', label: t('learning:tabs.projects') },
      { key: 'qa', label: t('learning:tabs.qa') },
    ],
    [t],
  );
  const header = useMemo(() => {
    // A PC window shows the course info under the video instead (DesktopLessonInfo).
    let info = null;
    if (!isWide && courseData) {
      info = (
        <CourseInfo
          title={courseData.title}
          likeCount={courseData.likeCount}
          shareCount={courseData.shareCount}
          isLiked={courseData.isLiked}
          onToggleLike={handleToggleLike}
          onShare={handleShare}
        />
      );
    } else if (!isWide) {
      info = (
        <View style={styles.infoSkeleton}>
          <Skeleton width="85%" height={26} />
          <Skeleton width="40%" height={20} />
        </View>
      );
    }
    return (
      <View style={styles.headerBlock}>
        {info}
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
      </View>
    );
  }, [courseData, handleShare, handleToggleLike, isWide, styles, tab, tabs]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, isWide ? styles.belowNav : null]}
      behavior="padding"
    >
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
      {/* One tree for every width (column on a phone, row on a PC): the player never remounts when the window is resized. */}
      <View style={isWide ? styles.bodyWide : styles.body}>
        <View style={isWide ? [styles.mainWide, autoScrollStyle()] : null}>
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
          {isWide ? (
            <DesktopLessonInfo
              lessonTitle={lesson.data?.title}
              course={courseData}
              onToggleLike={handleToggleLike}
              onShare={handleShare}
            />
          ) : null}
        </View>
        <View
          style={isWide ? [styles.panelWide, isDesktop ? styles.panelDesktop : null] : styles.panel}
        >
          <LearningTabBody
            courseId={courseId}
            tab={tab}
            header={header}
            curriculum={curriculum}
            activeLessonId={activeLessonId}
            lessonTitle={lesson.data?.title}
            onLessonPress={handleLessonPress}
            bottomPadding={insets.bottom + spacing.xxl}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  belowNav: { paddingTop: DESKTOP_NAV_HEIGHT },
  body: { flex: 1 },
  bodyWide: { flex: 1, flexDirection: 'row' },
  mainWide: { flex: 1, minWidth: 0 },
  panel: { flex: 1 },
  // Right-hand panel of the PC layout: the tabs scroll on their own, the video stays put.
  panelWide: {
    width: PANEL_WIDTH_TABLET,
    borderLeftWidth: 1,
    borderLeftColor: t.colors.border,
  },
  panelDesktop: { width: PANEL_WIDTH_DESKTOP },
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
}));
