import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedTabs } from '@/components/ui';
import { useIsLargeText } from '@/hooks/useFontScale';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CourseDetail } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';

import { useCourseDetailActions } from '../useCourseDetailActions';
import { useCourseTabs } from '../useCourseTabs';
import {
  COURSE_BOTTOM_BAR_CLEARANCE,
  COURSE_BOTTOM_BAR_LARGE_TEXT_EXTRA,
  CourseBottomBar,
} from './CourseBottomBar';
import { CourseHero } from './CourseHero';
import { CourseStats } from './CourseStats';
import { CourseTabContent } from './CourseTabContent';
import { TeacherRow } from './TeacherRow';

export type CourseDetailBodyProps = {
  course: CourseDetail;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Hero play button / a preview row of the Lessons tab: the screen owns the player modal. */
  onPlayPreview: (lessonId: string) => void;
};

/**
 * Loaded state of SC-09 on a phone: hero, teacher row, facts, tabs and the glass bottom bar. The PC
 * layout (>= 768 dp) is `CourseDesktopBody`; both share the actions and the tab / AI-scroll hooks.
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
  const actions = useCourseDetailActions(course);
  const {
    tabs,
    activeTab,
    isAiRequested,
    scrollRef,
    handleChangeTab,
    handleRequestAi,
    handleAskAi,
    handleAiLayout,
    handleTabContentLayout,
  } = useCourseTabs();

  const { teacher } = course;
  // Only "Best-seller" earns a tag; the discount already shows on the bottom bar (BR-10).
  const badge = getCourseBadge(course);
  const tag =
    badge?.kind === 'BEST_SELLER'
      ? t('hero.tagWithCategory', { badge: badge.label, category: course.category.name })
      : course.category.name;

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
          onToggleBookmark={actions.onToggleBookmark}
          isLiked={course.isLiked}
          onToggleLike={actions.onToggleLike}
          onShare={actions.onShare}
        />
        <TeacherRow
          teacher={teacher}
          onOpenTeacher={actions.onOpenTeacher}
          onToggleFollow={actions.onToggleFollow}
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
          <CourseTabContent
            course={course}
            tab={activeTab}
            canUseAi={actions.isSignedIn}
            isAiRequested={isAiRequested}
            onRequestAi={handleRequestAi}
            onAiLayout={handleAiLayout}
            onPlayPreview={onPlayPreview}
          />
        </View>
      </ScrollView>
      <CourseBottomBar
        course={course}
        isLoading={actions.isActionLoading}
        onAction={actions.onAction}
        onAskAi={actions.isSignedIn ? handleAskAi : undefined}
        isOwner={actions.isOwner}
        onManage={actions.onManage}
      />
    </>
  );
}

const useStyles = makeStyles(() => ({
  tabs: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.sm },
  tabContent: { paddingTop: spacing.xl },
}));
