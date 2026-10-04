import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import { useTabBarClearance } from '@/components/FloatingTabBar';
import {
  AppText,
  EmptyState,
  ErrorState,
  IconButton,
  ScreenHeader,
  showToast,
} from '@/components/ui';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { CourseResultList } from '@/features/search/components/CourseResultList';
import { openCourse, openSearchTab } from '@/features/search/navigation';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { makeStyles, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileMenu } from '../components/ProfileMenu';
import { ProfileStats } from '../components/ProfileStats';
import { useBookmarks, useMeStats } from '../hooks';

function goToMyCourses(status: 'ongoing' | 'completed'): void {
  router.navigate({ pathname: '/my-courses', params: { tab: status } });
}

function SavedSkeleton() {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View
      style={styles.skeletons}
      accessible
      accessibilityLabel={t('loading')}
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
  const { t } = useTranslation(['profile', 'common']);
  const styles = useStyles();
  const clearance = useTabBarClearance();
  const user = useAuthStore((state) => state.user);
  const confirmLogout = useConfirmLogout();
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
      showToast(t('removedFromSaved'), {
        actionLabel: t('undo'),
        onAction: () => toggleBookmark(course.id, false, course),
      });
    },
    [toggleBookmark, t],
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
  const handleSettings = useCallback(() => {
    setIsMenuOpen(false);
    router.push('/settings');
  }, []);
  const handleLogout = useCallback(() => {
    setIsMenuOpen(false);
    void confirmLogout();
  }, [confirmLogout]);

  let emptyState;
  if (bookmarks.isPending) {
    emptyState = <SavedSkeleton />;
  } else if (bookmarks.isError) {
    emptyState = <ErrorState error={bookmarks.error} onRetry={() => void refetchBookmarks()} />;
  } else {
    emptyState = (
      <EmptyState
        icon="bookmark"
        title={t('empty.title')}
        message={t('empty.message')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={openSearchTab}
      />
    );
  }

  return (
    <View style={styles.screen} testID="profile-screen">
      <ScreenHeader
        title={t('title')}
        showBack={false}
        right={
          <IconButton
            icon="more-vertical"
            onPress={() => setIsMenuOpen(true)}
            accessibilityLabel={t('menu.open')}
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
              {t('savedCourses')}
            </AppText>
          </View>
        }
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ paddingBottom: clearance + spacing.xxxl }}
      />
      {isMenuOpen ? (
        <ProfileMenu
          onClose={closeMenu}
          onEditProfile={handleEditProfile}
          onNotifications={handleNotifications}
          onSettings={handleSettings}
          onLogout={handleLogout}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  header: { gap: spacing.xl, marginBottom: spacing.lg },
  // Design: ~34 dp between the stats row and the "Saved courses" title.
  savedTitle: { marginTop: spacing.md },
  skeletons: { gap: spacing.lg },
}));
