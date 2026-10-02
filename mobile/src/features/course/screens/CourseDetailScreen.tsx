import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ErrorState, AppText, RatingInline, SegmentedTabs } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { CourseLessonsTab } from '@/features/learning/components/CourseLessonsTab';
import { CourseReviewsTab } from '@/features/review/components/CourseReviewsTab';
import { AppError } from '@/lib/appError';
import { colors, layout, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

import { CourseBottomBar } from '../components/CourseBottomBar';
import { CourseDetailHeader } from '../components/CourseDetailHeader';
import { CourseDetailSkeleton } from '../components/CourseDetailSkeleton';
import { CourseHero } from '../components/CourseHero';
import { CourseMoreMenu } from '../components/CourseMoreMenu';
import { CourseOverviewTab } from '../components/CourseOverviewTab';
import { PreviewPlayerModal } from '../components/PreviewPlayerModal';
import { useCourseDetail } from '../hooks';
import { useCourseAction } from '../useCourseAction';

export type CourseDetailScreenProps = { courseId: string };

type CourseTab = 'overview' | 'lessons' | 'review';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'review', label: 'Review' },
] as const;

type TabContentProps = {
  course: CourseDetail;
  tab: CourseTab;
  onPlayPreview: (lessonId: string) => void;
};

function TabContent({ course, tab, onPlayPreview }: TabContentProps) {
  if (tab === 'lessons') {
    return <CourseLessonsTab courseId={course.id} onPlayPreview={onPlayPreview} />;
  }
  if (tab === 'review') {
    return <CourseReviewsTab courseId={course.id} canWriteReview={course.enrollment !== null} />;
  }
  // Lessons/Review tabs pad themselves; only Overview needs the screen padding.
  return (
    <View style={styles.overviewPadding}>
      <CourseOverviewTab course={course} />
    </View>
  );
}

/**
 * SC-09 Course details: header, hero + preview player, title, OVERVIEW | LESSONS | REVIEW tabs
 * and the fixed bottom bar whose button follows BR-17.
 */
export function CourseDetailScreen({ courseId }: CourseDetailScreenProps) {
  const { data: course, isError, error, fetchStatus, refetch } = useCourseDetail(courseId);
  const { toggleBookmark } = useToggleBookmark();
  const { perform, isLoading } = useCourseAction(courseId);
  const [activeTab, setActiveTab] = useState<CourseTab>('overview');
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleBookmark = useCallback(() => {
    if (course) toggleBookmark(course.id, course.isBookmarked);
  }, [course, toggleBookmark]);

  const handleShare = useCallback(async () => {
    setIsMenuOpen(false);
    if (!course) return;
    try {
      await Share.share({
        message: `Check out "${course.title}" by ${course.teacher.fullName} on ${STRINGS.appName}`,
      });
    } catch {
      // The share sheet failed to open or was dismissed: nothing to recover.
    }
  }, [course]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const heroPreviewLessonId = course?.previewLessonId ?? null;
  const handlePlayHeroPreview = useCallback(() => {
    if (heroPreviewLessonId) setPreviewLessonId(heroPreviewLessonId);
  }, [heroPreviewLessonId]);

  const handleClosePreview = useCallback(() => setPreviewLessonId(null), []);
  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), []);
  const handleOpenMenu = useCallback(() => setIsMenuOpen(true), []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const isOfflineWithoutData = !course && fetchStatus === 'paused';
  const failure = isOfflineWithoutData
    ? new AppError({ status: 0, code: 'OFFLINE', message: STRINGS.errors.offline })
    : error;

  return (
    <View style={styles.screen}>
      <CourseDetailHeader
        isBookmarked={course ? course.isBookmarked : null}
        onToggleBookmark={handleToggleBookmark}
        onOpenMenu={handleOpenMenu}
      />
      {course ? (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void handleRefresh()}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            <CourseHero
              imageUrl={course.bannerUrl ?? course.thumbnailUrl}
              canPlayPreview={course.previewLessonId !== null}
              onPlayPreview={handlePlayHeroPreview}
            />
            <View style={styles.info}>
              <AppText variant="h3" accessibilityRole="header">
                {course.title}
              </AppText>
              <RatingInline
                rating={course.ratingAvg}
                count={course.ratingCount}
                lessonCount={course.lessonCount}
              />
            </View>
            <SegmentedTabs
              tabs={TABS}
              value={activeTab}
              onChange={setActiveTab}
              style={styles.tabs}
            />
            <View style={styles.tabContent}>
              <TabContent course={course} tab={activeTab} onPlayPreview={setPreviewLessonId} />
            </View>
          </ScrollView>
          <CourseBottomBar course={course} isLoading={isLoading} onAction={perform} />
        </>
      ) : isError || isOfflineWithoutData ? (
        <ErrorState error={failure} onRetry={handleRetry} />
      ) : (
        <ScrollView scrollEnabled={false}>
          <CourseDetailSkeleton />
        </ScrollView>
      )}
      <CourseMoreMenu visible={isMenuOpen} onClose={handleCloseMenu} onShare={handleShare} />
      <PreviewPlayerModal lessonId={previewLessonId} onClose={handleClosePreview} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  info: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  tabs: { marginHorizontal: layout.screenPaddingX },
  tabContent: { paddingTop: spacing.xxl },
  overviewPadding: { paddingHorizontal: layout.screenPaddingX },
});
