import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { WorkFrame, WorkHeader } from '@/components/layout/work';
import { AppText, ErrorState, SegmentedTabs, Skeleton, type SegmentedTab } from '@/components/ui';
import { useTransparentNav } from '@/features/course/useTransparentNav';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { makeStyles, spacing } from '@/theme';

import { TeacherCoursesDesktop } from '../components/desktop/TeacherCoursesDesktop';
import { TeacherHeroDesktop } from '../components/desktop/TeacherHeroDesktop';
import { TeacherReviewsDesktop } from '../components/desktop/TeacherReviewsDesktop';
import { TeacherStatsStrip } from '../components/desktop/TeacherStatsStrip';
import {
  useTeacher,
  useTeacherCourseBookmark,
  useTeacherCourses,
  useTeacherReviews,
  useToggleFollow,
} from '../hooks';
import type { TeacherTab } from '../teacherRows';
import { useShareTeacher } from '../useShareTeacher';

export type TeacherProfileDesktopScreenProps = { teacherId: string };

const HERO_MIN_HEIGHT = 420;
const HERO_MAX_HEIGHT = 520;
const HERO_HEIGHT_RATIO = 0.5;
const TABS_WIDTH = 480;
const BIO_MAX_WIDTH = 760;

function DesktopSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.screen} testID="teacher-profile-skeleton">
      <Skeleton height={HERO_MIN_HEIGHT} borderRadius={0} />
      <PageContainer style={styles.skeletonBody}>
        <Skeleton height={88} />
        <Skeleton height={44} width={TABS_WIDTH} />
        <Skeleton height={160} />
      </PageContainer>
    </View>
  );
}

/**
 * SC-18 Teacher profile on a PC window (PLAN §2.5): a full-bleed hero (cover, avatar, name, job
 * title, Follow / Share), the four numbers, then OVERVIEW | COURSES | REVIEWS - courses as a grid
 * of hover cards per category, reviews in two columns.
 */
export function TeacherProfileDesktopScreen({ teacherId }: TeacherProfileDesktopScreenProps) {
  const { t } = useTranslation(['teacher', 'common']);
  const styles = useStyles();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.round(
    Math.min(Math.max(windowHeight * HERO_HEIGHT_RATIO, HERO_MIN_HEIGHT), HERO_MAX_HEIGHT),
  );
  const [tab, setTab] = useState<TeacherTab>('overview');
  const currentUserId = useAuthStore((state) => state.user?.id);
  const handleScroll = useTransparentNav();

  const teacherQuery = useTeacher(teacherId);
  const coursesQuery = useTeacherCourses(teacherId, tab === 'courses');
  const reviewsQuery = useTeacherReviews(teacherId, tab === 'review');
  const { toggleFollow, isPending: isFollowPending } = useToggleFollow();
  const toggleBookmark = useTeacherCourseBookmark();
  const teacher = teacherQuery.data;
  const handleShare = useShareTeacher(teacher);

  const tabs = useMemo<readonly SegmentedTab<TeacherTab>[]>(
    () => [
      { key: 'overview', label: t('teacher:tabs.overview') },
      { key: 'courses', label: t('teacher:tabs.courses') },
      { key: 'review', label: t('teacher:tabs.reviews') },
    ],
    [t],
  );
  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [reviewsQuery.data],
  );

  const handleToggleFollow = useCallback(() => {
    if (teacher && !isFollowPending) toggleFollow(teacherId, teacher.isFollowed);
  }, [teacher, isFollowPending, toggleFollow, teacherId]);
  const handleViewAll = useCallback(
    (categoryId: string) => {
      router.push(`/course-list?teacherId=${teacherId}&categoryId=${categoryId}`);
    },
    [teacherId],
  );
  const { fetchNextPage: fetchNextReviews } = reviewsQuery;
  const handleLoadMoreReviews = useCallback(() => void fetchNextReviews(), [fetchNextReviews]);

  if (teacherQuery.isPending) return <DesktopSkeleton />;
  if (teacherQuery.isError || !teacher) {
    return (
      <WorkFrame>
        <PageContainer style={styles.failed}>
          <WorkHeader title={t('teacher:profileTitle')} hasBack />
          <ErrorState error={teacherQuery.error} onRetry={() => void teacherQuery.refetch()} />
        </PageContainer>
      </WorkFrame>
    );
  }

  let content;
  if (tab === 'courses') {
    content = (
      <TeacherCoursesDesktop
        groups={coursesQuery.data}
        isPending={coursesQuery.isPending}
        isError={coursesQuery.isError}
        error={coursesQuery.error}
        onRetry={() => void coursesQuery.refetch()}
        onToggleBookmark={toggleBookmark}
        onViewAll={handleViewAll}
      />
    );
  } else if (tab === 'review') {
    content = (
      <TeacherReviewsDesktop
        reviews={reviews}
        isPending={reviewsQuery.isPending}
        isError={reviewsQuery.isError}
        error={reviewsQuery.error}
        onRetry={() => void reviewsQuery.refetch()}
        hasNextPage={Boolean(reviewsQuery.hasNextPage)}
        isFetchingNextPage={reviewsQuery.isFetchingNextPage}
        onLoadMore={handleLoadMoreReviews}
      />
    );
  } else {
    content = (
      <AppText variant="bodyLarge" color="textSecondary" style={styles.bio}>
        {teacher.bio ? teacher.bio : t('teacher:overviewEmpty')}
      </AppText>
    );
  }

  return (
    <ScrollView
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scroll}
      testID="teacher-desktop-scroll"
    >
      <TeacherHeroDesktop
        teacher={teacher}
        height={heroHeight}
        isOwnProfile={currentUserId === teacher.id}
        onToggleFollow={handleToggleFollow}
        onShare={handleShare}
      />
      <PageContainer style={styles.body}>
        <TeacherStatsStrip teacher={teacher} />
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />
        <View style={styles.content}>{content}</View>
      </PageContainer>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  scroll: { paddingBottom: spacing.huge, backgroundColor: t.colors.background },
  body: { gap: spacing.xl },
  tabs: { width: '100%', maxWidth: TABS_WIDTH },
  content: { paddingTop: spacing.sm },
  bio: { maxWidth: BIO_MAX_WIDTH },
  skeletonBody: { gap: spacing.xl, paddingTop: spacing.xl },
  failed: { paddingTop: spacing.xxl },
}));
