import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedTabs, type SegmentedTab } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { CourseLessonsTab } from '@/features/learning/components/CourseLessonsTab';
import { useToggleCourseLike } from '@/features/learning/hooks';
import { CourseReviewsTab } from '@/features/review/components/CourseReviewsTab';
import { useToggleFollow } from '@/features/teacher/hooks';
import { useIsLargeText } from '@/hooks/useFontScale';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CourseDetail } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';

import { useCourseAction } from '../useCourseAction';
import { useShareCourse } from '../useShareCourse';
import {
  COURSE_BOTTOM_BAR_CLEARANCE,
  COURSE_BOTTOM_BAR_LARGE_TEXT_EXTRA,
  CourseBottomBar,
} from './CourseBottomBar';
import { CourseHero } from './CourseHero';
import { CourseOverviewTab } from './CourseOverviewTab';
import { CourseStats } from './CourseStats';
import { TeacherRow } from './TeacherRow';

export type CourseDetailBodyProps = {
  course: CourseDetail;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Hero play button / a preview row of the Lessons tab: the screen owns the player modal. */
  onPlayPreview: (lessonId: string) => void;
};

type CourseTab = 'overview' | 'lessons' | 'reviews';

/** Gap kept above the AI block when the bottom-bar AI button scrolls to it. */
const AI_SCROLL_MARGIN = spacing.lg;

/**
 * Loaded state of SC-09: hero, teacher row, facts, tabs and the glass bottom bar. It owns the tab,
 * the AI-summary request and the scroll that takes the bottom bar's AI button to the AI block.
 */
export function CourseDetailBody({
  course,
  isRefreshing,
  onRefresh,
  onPlayPreview,
}: CourseDetailBodyProps) {
  const { t } = useTranslation('course');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isLargeText = useIsLargeText();
  const barClearance =
    COURSE_BOTTOM_BAR_CLEARANCE + (isLargeText ? COURSE_BOTTOM_BAR_LARGE_TEXT_EXTRA : 0);
  const isSignedIn = useAuthStore((state) => state.user !== null);
  const { toggleBookmark } = useToggleBookmark();
  const { mutate: toggleLike } = useToggleCourseLike(course.id);
  const { toggleFollow } = useToggleFollow();
  const share = useShareCourse(course);
  const { perform, isLoading } = useCourseAction(course.id);
  const [activeTab, setActiveTab] = useState<CourseTab>('overview');
  const [isAiRequested, setIsAiRequested] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const tabContentY = useRef(0);
  const aiY = useRef<number | null>(null);
  const isScrollToAiPending = useRef(false);

  const tabs = useMemo<readonly SegmentedTab<CourseTab>[]>(
    () => [
      { key: 'overview', label: t('tabs.overview') },
      { key: 'lessons', label: t('tabs.lessons') },
      { key: 'reviews', label: t('tabs.reviews') },
    ],
    [t],
  );

  const scrollToAi = useCallback(() => {
    if (aiY.current === null) return;
    isScrollToAiPending.current = false;
    scrollRef.current?.scrollTo({
      y: Math.max(0, tabContentY.current + aiY.current - AI_SCROLL_MARGIN),
      animated: true,
    });
  }, []);
  const handleAiLayout = useCallback(
    (y: number) => {
      aiY.current = y;
      if (isScrollToAiPending.current) scrollToAi();
    },
    [scrollToAi],
  );
  const handleTabContentLayout = useCallback((event: LayoutChangeEvent) => {
    tabContentY.current = event.nativeEvent.layout.y;
  }, []);
  const handleChangeTab = useCallback((tab: CourseTab) => {
    aiY.current = null;
    setActiveTab(tab);
  }, []);
  const handleRequestAi = useCallback(() => setIsAiRequested(true), []);
  const handleAskAi = useCallback(() => {
    setIsAiRequested(true);
    isScrollToAiPending.current = true;
    if (activeTab === 'overview') scrollToAi();
    else handleChangeTab('overview');
  }, [activeTab, handleChangeTab, scrollToAi]);

  const { teacher } = course;
  // Only "Best-seller" earns a tag; the discount already shows on the bottom bar (BR-10).
  const badge = getCourseBadge(course);
  const tag =
    badge?.kind === 'BEST_SELLER'
      ? t('hero.tagWithCategory', { badge: badge.label, category: course.category.name })
      : course.category.name;

  let tabContent;
  if (activeTab === 'lessons') {
    tabContent = <CourseLessonsTab courseId={course.id} onPlayPreview={onPlayPreview} />;
  } else if (activeTab === 'reviews') {
    tabContent = (
      <CourseReviewsTab courseId={course.id} canWriteReview={course.enrollment !== null} />
    );
  } else {
    tabContent = (
      <CourseOverviewTab
        course={course}
        canUseAi={isSignedIn}
        isAiRequested={isAiRequested}
        onRequestAi={handleRequestAi}
        onAiLayout={handleAiLayout}
      />
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: barClearance + insets.bottom + spacing.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primaryText}
            progressViewOffset={insets.top}
          />
        }
      >
        <CourseHero
          imageUrl={course.bannerUrl ?? course.thumbnailUrl}
          title={course.title}
          tag={tag}
          ratingAvg={course.ratingAvg}
          ratingCount={course.ratingCount}
          canPlayPreview={course.previewLessonId !== null}
          onPlayPreview={() => {
            if (course.previewLessonId) onPlayPreview(course.previewLessonId);
          }}
          isBookmarked={course.isBookmarked}
          onToggleBookmark={() => toggleBookmark(course.id, course.isBookmarked)}
          isLiked={course.isLiked}
          onToggleLike={() => toggleLike(course.isLiked)}
          onShare={() => void share()}
        />
        <TeacherRow
          teacher={teacher}
          onOpenTeacher={() => router.push(`/teacher/${teacher.id}`)}
          onToggleFollow={() => toggleFollow(teacher.id, teacher.isFollowed)}
        />
        <CourseStats
          lessonCount={course.lessonCount}
          totalDurationSec={course.totalDurationSec}
          likeCount={course.likeCount}
        />
        <SegmentedTabs
          tabs={tabs}
          value={activeTab}
          onChange={handleChangeTab}
          style={styles.tabs}
        />
        <View style={styles.tabContent} onLayout={handleTabContentLayout}>
          {tabContent}
        </View>
      </ScrollView>
      <CourseBottomBar
        course={course}
        isLoading={isLoading}
        onAction={perform}
        onAskAi={isSignedIn ? handleAskAi : undefined}
      />
    </>
  );
}

const useStyles = makeStyles(() => ({
  tabs: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.sm },
  tabContent: { paddingTop: spacing.xl },
}));
