import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import {
  AppText,
  EmptyState,
  ErrorState,
  IconButton,
  ScreenHeader,
  showToast,
} from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { CourseResultList } from '@/features/search/components/CourseResultList';
import { openCourse, openSearchTab } from '@/features/search/navigation';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileMenu } from '../components/ProfileMenu';
import { ProfileStats } from '../components/ProfileStats';
import { useBookmarks, useMeStats } from '../hooks';

const PROFILE_STRINGS = {
  title: "User's profile",
  menu: 'More options',
  saved: 'Saved courses',
  emptyTitle: 'No saved courses yet',
  emptyMessage: 'Tap the bookmark on a course to keep it here.',
  removed: 'Removed from saved courses',
  undo: 'Undo',
  logoutMessage: 'Are you sure you want to log out?',
} as const;

function goToMyCourses(status: 'ongoing' | 'completed'): void {
  router.navigate({ pathname: '/my-courses', params: { tab: status } });
}

function SavedSkeleton() {
  return (
    <View
      style={styles.skeletons}
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
    </View>
  );
}

/** SC-20 User profile: cover, avatar, name, stats, Saved courses and the "⋮" menu. */
export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const stats = useMeStats();
  const bookmarks = useBookmarks();
  const { toggleBookmark } = useToggleBookmark();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refetch: refetchStats } = stats;
  const { refetch: refetchBookmarks, fetchNextPage, hasNextPage, isFetchingNextPage } = bookmarks;

  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => {
      toggleBookmark(course.id, course.isBookmarked, course);
      showToast(PROFILE_STRINGS.removed, {
        actionLabel: PROFILE_STRINGS.undo,
        onAction: () => toggleBookmark(course.id, false, course),
      });
    },
    [toggleBookmark],
  );
  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refetchStats(), refetchBookmarks()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchStats, refetchBookmarks]);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const handleEditProfile = useCallback(() => {
    setIsMenuOpen(false);
    router.push('/profile/edit');
  }, []);
  const handleNotifications = useCallback(() => {
    setIsMenuOpen(false);
    router.push('/notifications');
  }, []);
  const handleLogout = useCallback(() => {
    setIsMenuOpen(false);
    Alert.alert(STRINGS.auth.logout, PROFILE_STRINGS.logoutMessage, [
      { text: STRINGS.common.cancel, style: 'cancel' },
      { text: STRINGS.auth.logout, style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  let emptyState;
  if (bookmarks.isPending) {
    emptyState = <SavedSkeleton />;
  } else if (bookmarks.isError) {
    emptyState = <ErrorState error={bookmarks.error} onRetry={() => void refetchBookmarks()} />;
  } else {
    emptyState = (
      <EmptyState
        icon="bookmark"
        title={PROFILE_STRINGS.emptyTitle}
        message={PROFILE_STRINGS.emptyMessage}
        actionLabel={STRINGS.common.exploreCourses}
        onAction={openSearchTab}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={PROFILE_STRINGS.title}
        showBack={false}
        right={
          <IconButton
            icon="more-vertical"
            onPress={() => setIsMenuOpen(true)}
            accessibilityLabel={PROFILE_STRINGS.menu}
          />
        }
      />
      <CourseResultList
        courses={bookmarks.courses}
        onPressCourse={handlePressCourse}
        onToggleBookmark={handleToggleBookmark}
        onEndReached={handleEndReached}
        isFetchingNextPage={isFetchingNextPage}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        ListHeaderComponent={
          <View style={styles.header}>
            <ProfileInfo user={user} />
            <ProfileStats
              stats={stats.data}
              isLoading={stats.isPending}
              onPressOngoing={() => goToMyCourses('ongoing')}
              onPressCompleted={() => goToMyCourses('completed')}
            />
            <AppText variant="title" accessibilityRole="header" style={styles.savedTitle}>
              {PROFILE_STRINGS.saved}
            </AppText>
          </View>
        }
        ListEmptyComponent={emptyState}
      />
      {isMenuOpen ? (
        <ProfileMenu
          onClose={closeMenu}
          onEditProfile={handleEditProfile}
          onNotifications={handleNotifications}
          onLogout={handleLogout}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.xl, marginBottom: spacing.lg },
  // Design: ~34 dp between the stats row and the "Saved courses" title.
  savedTitle: { marginTop: spacing.md },
  skeletons: { gap: spacing.lg },
});
