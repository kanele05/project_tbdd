import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { STRINGS } from '@/constants/strings';
import { ReviewCard } from '@/features/review/components/ReviewCard';
import { useAuthStore } from '@/stores/authStore';
import { colors, layout, spacing } from '@/theme';
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

const TABS: readonly SegmentedTab<TeacherTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'courses', label: 'Courses' },
  { key: 'review', label: 'Review' },
];

/**
 * SC-18 Teacher profile (FR-20): header with cover/avatar/local time, then OVERVIEW | COURSES |
 * REVIEW tabs. One FlashList serves all tabs (the header scrolls with the content and the Review
 * tab paginates infinitely), so there is no nested vertical scrolling.
 */
export function TeacherProfileScreen({ teacherId }: TeacherProfileScreenProps) {
  const [tab, setTab] = useState<TeacherTab>('overview');
  const currentUserId = useAuthStore((state) => state.user?.id);

  const teacherQuery = useTeacher(teacherId);
  const coursesQuery = useTeacherCourses(teacherId, tab === 'courses');
  const reviewsQuery = useTeacherReviews(teacherId, tab === 'review');
  const { toggleFollow, isPending: isFollowPending } = useToggleFollow();
  const toggleBookmark = useTeacherCourseBookmark();

  const teacher = teacherQuery.data;
  const isFollowed = teacher?.isFollowed ?? false;

  const handleToggleFollow = useCallback(() => {
    if (!isFollowPending) toggleFollow(teacherId, isFollowed);
  }, [isFollowPending, toggleFollow, teacherId, isFollowed]);

  // The design's "more" button: a small menu with Share (no other teacher actions exist).
  const handleMore = useCallback(() => {
    if (!teacher) return;
    const message = `${teacher.fullName} - ${teacher.jobTitle} on ${STRINGS.appName}`;
    Alert.alert(teacher.fullName, undefined, [
      {
        text: 'Share profile',
        onPress: () => void Share.share({ message }).catch(() => undefined),
      },
      { text: STRINGS.common.cancel, style: 'cancel' },
    ]);
  }, [teacher]);

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
          return (
            <TeacherOverviewTab
              teacher={item.teacher}
              isOwnProfile={currentUserId === item.teacher.id}
              onToggleFollow={handleToggleFollow}
            />
          );
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
    [currentUserId, handleToggleFollow, handlePressCourse, toggleBookmark, handleViewAll],
  );

  const header = useMemo(
    () =>
      teacher ? (
        <View>
          <TeacherProfileHeader teacher={teacher} />
          <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} style={styles.tabs} />
        </View>
      ) : null,
    [teacher, tab],
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
      <ActivityIndicator color={colors.primary} style={styles.footer} />
    ) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Teacher's profile"
        right={
          teacher ? (
            <IconButton
              icon="more-vertical"
              onPress={handleMore}
              accessibilityLabel="More options"
              color="textSecondary"
            />
          ) : null
        }
      />
      {teacherQuery.isPending ? (
        <TeacherProfileSkeleton />
      ) : teacherQuery.isError || !teacher ? (
        <ErrorState error={teacherQuery.error} onRetry={() => void teacherQuery.refetch()} />
      ) : (
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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.xl },
  content: { paddingBottom: spacing.xxxl },
  review: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  footer: { paddingVertical: spacing.lg },
});
