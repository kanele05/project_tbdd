import { ScrollView, View, useWindowDimensions } from 'react-native';

import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { SegmentedTabs } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';

import { useCourseDetailActions } from '../../useCourseDetailActions';
import { useCourseTabs } from '../../useCourseTabs';
import { useTransparentNav } from '../../useTransparentNav';
import { CourseStats } from '../CourseStats';
import { CourseTabContent } from '../CourseTabContent';
import { TeacherRow } from '../TeacherRow';
import { CourseDesktopHero } from './CourseDesktopHero';
import { CoursePurchaseCard } from './CoursePurchaseCard';
import { SimilarCoursesRow } from './SimilarCoursesRow';

export type CourseDesktopBodyProps = {
  course: CourseDetail;
  /** Hero / preview buttons and the preview rows of the Lessons tab: the screen owns the player modal. */
  onPlayPreview: (lessonId: string) => void;
};

const HERO_MIN_HEIGHT = 480;
const HERO_MAX_HEIGHT = 680;
const HERO_HEIGHT_RATIO = 0.62;
/** Width of the right-hand purchase column on desktop. */
const SIDE_WIDTH = 380;

/**
 * Loaded state of SC-09 on a PC / tablet window (PLAN §2.5, Netflix title page): a full-bleed hero
 * under the transparent nav, then two columns (tabs | sticky purchase card) and similar courses.
 * Below 1024 dp the card moves above the tabs and stops being sticky.
 */
export function CourseDesktopBody({ course, onPlayPreview }: CourseDesktopBodyProps) {
  const { t } = useTranslation('course');
  const styles = useStyles();
  const { isDesktop } = useBreakpoint();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.round(
    Math.min(Math.max(windowHeight * HERO_HEIGHT_RATIO, HERO_MIN_HEIGHT), HERO_MAX_HEIGHT),
  );
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
    handleBaseLayout,
    handleMainLayout,
  } = useCourseTabs({ topClearance: DESKTOP_NAV_HEIGHT });
  const handleScroll = useTransparentNav();

  const badge = getCourseBadge(course);
  const tag =
    badge?.kind === 'BEST_SELLER'
      ? t('hero.tagWithCategory', { badge: badge.label, category: course.category.name })
      : course.category.name;
  const handlePlayPreview = () => {
    if (course.previewLessonId) onPlayPreview(course.previewLessonId);
  };

  const side = (
    <View style={isDesktop ? styles.side : styles.sideStacked}>
      <CoursePurchaseCard
        course={course}
        actions={actions}
        onPlayPreview={handlePlayPreview}
        onAskAi={actions.isSignedIn ? handleAskAi : undefined}
        isSticky={isDesktop}
      />
    </View>
  );

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scroll}
      testID="course-desktop-scroll"
    >
      <CourseDesktopHero
        course={course}
        tag={tag}
        height={heroHeight}
        actions={actions}
        onPlayPreview={handlePlayPreview}
      />
      <View onLayout={handleBaseLayout}>
        <PageContainer
          style={[styles.columns, isDesktop ? styles.columnsRow : null]}
          testID="course-columns"
        >
          {isDesktop ? null : side}
          <View style={styles.main} onLayout={handleMainLayout}>
            {/* The phone sections pad themselves by the gutter: bleed it so the text lines up. */}
            <View style={styles.bleed}>
              <TeacherRow
                teacher={course.teacher}
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
                  showSimilar={false}
                  showBenefits={false}
                />
              </View>
            </View>
          </View>
          {isDesktop ? side : null}
        </PageContainer>
      </View>
      <PageContainer>
        <SimilarCoursesRow courseId={course.id} />
      </PageContainer>
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  scroll: { paddingBottom: spacing.huge },
  columns: { paddingTop: spacing.xxxl, gap: spacing.xxxl },
  columnsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  bleed: { marginHorizontal: -layout.screenPaddingX },
  side: { width: SIDE_WIDTH, alignSelf: 'stretch' },
  sideStacked: { width: '100%' },
  tabs: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.sm },
  tabContent: { paddingTop: spacing.xl },
}));
