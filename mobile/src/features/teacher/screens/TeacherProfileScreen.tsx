import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { ReviewCard } from '@/features/review/components/ReviewCard';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { TeacherCourseGroup } from '../components/TeacherCourseGroup';
import { TeacherOverviewTab } from '../components/TeacherOverviewTab';
import { TeacherProfileHeader } from '../components/TeacherProfileHeader';
import { TeacherProfileSkeleton } from '../components/TeacherSkeletons';
import { TeacherTabState } from '../components/TeacherTabState';
import {
  useTeacher,
  useTeacherCourseBookmark,
  useTeacherCourses,
  useTeacherReviews,
  useToggleFollow,
} from '../hooks';
import {
  buildTeacherRows,
  getTeacherRowKey,
  getTeacherRowType,
  type TeacherRow,
  type TeacherTab,
} from '../teacherRows';

export type TeacherProfileScreenProps = { teacherId: string };

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-18 Teacher profile (FR-20): hero header (cover, avatar, numbers, Follow), then OVERVIEW |
 * COURSES | REVIEWS tabs. One FlashList serves all tabs (the header scrolls with the content and
 * the Reviews tab paginates infinitely), so there is no nested vertical scrolling.
 */
export function TeacherProfileScreen({ teacherId }: TeacherProfileScreenProps) {
  const { t } = useTranslation(['teacher', 'common']);
  const { colors } = useTheme();
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TeacherTab>('overview');
  const currentUserId = useAuthStore((state) => state.user?.id);

  const teacherQuery = useTeacher(teacherId);
  const coursesQuery = useTeacherCourses(teacherId, tab === 'courses');
  const reviewsQuery = useTeacherReviews(teacherId, tab === 'review');
  const { toggleFollow, isPending: isFollowPending } = useToggleFollow();
  const toggleBookmark = useTeacherCourseBookmark();

  const teacher = teacherQuery.data;
  const isFollowed = teacher?.isFollowed ?? false;

  const tabs = useMemo<readonly SegmentedTab<TeacherTab>[]>(
    () => [
      { key: 'overview', label: t('teacher:tabs.overview') },
      { key: 'courses', label: t('teacher:tabs.courses') },
      { key: 'review', label: t('teacher:tabs.reviews') },
    ],
    [t],
  );

  const handleToggleFollow = useCallback(() => {
    if (!isFollowPending) toggleFollow(teacherId, isFollowed);
  }, [isFollowPending, toggleFollow, teacherId, isFollowed]);

  const handleShare = useCallback(() => {
    if (!teacher) return;
    const message = t('teacher:share.message', {
      name: teacher.fullName,
      job: teacher.jobTitle,
      app: t('common:appName'),
    });
    void Share.share({ message }).catch(() => undefined);
  }, [teacher, t]);

  const handlePressCourse = useCallback((course: CourseSummary) => {
    router.push(`/course/${course.id}`);
  }, []);

  const handleViewAll = useCallback(
    (categoryId: string) => {
      router.push(`/course-list?teacherId=${teacherId}&categoryId=${categoryId}`);
    },
    [teacherId],
  );

  const rows = useMemo(
    () =>
      buildTeacherRows(
        tab,
        teacher,
        coursesQuery.data,
        reviewsQuery.data?.pages.flatMap((page) => page.data),
      ),
    [tab, teacher, coursesQuery.data, reviewsQuery.data],
  );

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<TeacherRow>) => {
      switch (item.kind) {
        case 'overview':
          return <TeacherOverviewTab teacher={item.teacher} />;
        case 'group':
          return (
            <TeacherCourseGroup
              group={item.group}
              onPressCourse={handlePressCourse}
              onToggleBookmark={toggleBookmark}
              onViewAll={handleViewAll}
            />
          );
        case 'review':
          return (
            <View style={styles.review}>
              <ReviewCard review={item.review} showCourseTitle />
            </View>
          );
      }
    },
    [handlePressCourse, toggleBookmark, handleViewAll],
  );

  const header = useMemo(
    () =>
      teacher ? (
        <View>
          <TeacherProfileHeader
            teacher={teacher}
            isOwnProfile={currentUserId === teacher.id}
            onToggleFollow={handleToggleFollow}
            onShare={handleShare}
          />
          <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />
        </View>
      ) : null,
    [teacher, currentUserId, handleToggleFollow, handleShare, tabs, tab],
  );

  const tabQuery = tab === 'courses' ? coursesQuery : tab === 'review' ? reviewsQuery : null;
  const emptyState = tabQuery ? (
    <TeacherTabState
      tab={tab === 'courses' ? 'courses' : 'review'}
      isPending={tabQuery.isPending}
      isError={tabQuery.isError}
      error={tabQuery.error}
      onRetry={() => void tabQuery.refetch()}
    />
  ) : null;

  const handleEndReached = useCallback(() => {
    if (tab === 'review' && reviewsQuery.hasNextPage && !reviewsQuery.isFetchingNextPage) {
      void reviewsQuery.fetchNextPage();
    }
  }, [tab, reviewsQuery]);

  const footer =
    tab === 'review' && reviewsQuery.isFetchingNextPage ? (
      <ActivityIndicator color={colors.primaryText} style={styles.footer} />
    ) : null;

  let body;
  if (teacherQuery.isPending) {
    body = (
      <>
        <TeacherProfileSkeleton />
        <View style={[styles.floatingBack, { top: insets.top + spacing.sm }]}>
          <GlassIconButton
            icon="chevron-left"
            accessibilityLabel={t('common:actions.back')}
            onPress={goBack}
          />
        </View>
      </>
    );
  } else if (teacherQuery.isError || !teacher) {
    body = (
      <>
        <ScreenHeader />
        <ErrorState error={teacherQuery.error} onRetry={() => void teacherQuery.refetch()} />
      </>
    );
  } else {
    body = (
      <FlashList
        data={rows}
        renderItem={renderRow}
        keyExtractor={getTeacherRowKey}
        getItemType={getTeacherRowType}
        extraData={currentUserId}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        ListFooterComponent={footer}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={themed.screen}>
      {/* The cover photo is dark in both themes: light status-bar icons while it is on screen. */}
      <StatusBar style={teacher ? 'light' : 'auto'} />
      {body}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  tabs: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.xl },
  review: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  footer: { paddingVertical: spacing.lg },
  floatingBack: { position: 'absolute', left: layout.screenPaddingX },
});
