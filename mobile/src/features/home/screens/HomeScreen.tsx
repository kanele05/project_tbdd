import { useQueryClient } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardVertical } from '@/components/course';
import { useTabBarClearance } from '@/components/FloatingTabBar';
import { EmptyState, ErrorState, RailList } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useCartCount } from '@/features/cart/hooks';
import { useUnreadNotificationCount } from '@/features/notification/hooks';
import { BrandRefreshControl } from '@/features/search/components/BrandRefreshControl';
import {
  openCourse,
  openCourseList,
  openSearchTab,
  openTeacher,
  openTopTeachers,
} from '@/features/search/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing } from '@/theme';
import type { CategoryDto, CourseSummary, HomeResponse } from '@/types/api';

import { AiRecommendationsCard } from '../components/AiRecommendationsCard';
import { CategoryChips } from '../components/CategoryChips';
import { ContinueRail } from '../components/ContinueRail';
import { HomeHero, HomeHeroSkeleton } from '../components/HomeHero';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { HomeTopBar } from '../components/HomeTopBar';
import { InspireRail } from '../components/InspireRail';
import { RankedRail } from '../components/RankedRail';
import { TeacherRail } from '../components/TeacherRail';
import { getGivenName } from '../greeting';
import { buildHeroSlides } from '../heroSlides';
import { useHome } from '../hooks';
import { HomeDesktopScreen } from './HomeDesktopScreen';

function isHomeEmpty(home: HomeResponse): boolean {
  return (
    home.banners.length === 0 &&
    home.categories.length === 0 &&
    home.popular.length === 0 &&
    home.recommended.length === 0 &&
    home.inspires.length === 0 &&
    home.topTeachers.length === 0
  );
}

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

type HomeSectionsProps = {
  home: HomeResponse;
  onToggleBookmark: (course: CourseSummary) => void;
};

/** Everything below the hero. A section is hidden when the server sent an empty list for it. */
function HomeSections({ home, onToggleBookmark }: HomeSectionsProps) {
  const { t } = useTranslation('home');
  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handlePressCategory = useCallback(
    (category: CategoryDto) => openCourseList({ categoryId: category.id, title: category.name }),
    [],
  );
  const renderRecommended = useCallback(
    (course: CourseSummary) => (
      <CourseCardVertical
        course={course}
        onPress={handlePressCourse}
        onToggleBookmark={onToggleBookmark}
      />
    ),
    [handlePressCourse, onToggleBookmark],
  );

  return (
    <>
      <ContinueRail />
      {home.categories.length > 0 ? (
        <CategoryChips
          categories={home.categories}
          onPressCategory={handlePressCategory}
          onPressAll={openSearchTab}
        />
      ) : null}
      {home.popular.length > 0 ? (
        <RankedRail
          title={t('popular')}
          courses={home.popular}
          onPressCourse={handlePressCourse}
          onViewMore={() => openCourseList({ section: 'popular' })}
        />
      ) : null}
      <AiRecommendationsCard />
      {home.recommended.length > 0 ? (
        <RailList
          title={t('recommended')}
          onViewMore={() => openCourseList({ section: 'recommended' })}
          data={home.recommended}
          keyExtractor={keyExtractor}
          renderItem={renderRecommended}
        />
      ) : null}
      {home.inspires.length > 0 ? (
        <InspireRail
          title={t('inspires')}
          courses={home.inspires}
          onPressCourse={handlePressCourse}
          onViewMore={() => openCourseList({ section: 'inspires' })}
        />
      ) : null}
      {home.topTeachers.length > 0 ? (
        <TeacherRail
          title={t('topTeachers')}
          teachers={home.topTeachers}
          onPressTeacher={openTeacher}
          onViewMore={openTopTeachers}
        />
      ) : null}
    </>
  );
}

/** SC-04 Home on phones: 1 request (`GET /home`) + "continue learning", AI picks, badges. */
function HomePhoneScreen() {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const fullName = useAuthStore((state) => state.user?.fullName);
  const cartCount = useCartCount();
  const unreadCount = useUnreadNotificationCount();
  const { toggleBookmark } = useToggleBookmark();
  const { data, isPending, isError, error, refetch } = useHome();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked),
    [toggleBookmark],
  );
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // The badges and "continue learning" live in other queries: refresh them with the home data.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meCourses('ongoing') });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetch]);

  const slides = useMemo(
    () =>
      data
        ? buildHeroSlides(data, {
            featuredTag: t('hero.featuredTag'),
            viewCourse: t('hero.viewCourse'),
          })
        : [],
    [data, t],
  );

  const givenName = getGivenName(fullName);
  const renderTopBar = (isOnPhoto: boolean) => (
    <HomeTopBar
      greeting={givenName ? t('greeting', { name: givenName }) : t('greetingAnonymous')}
      subtitle={t('subtitle')}
      cartCount={cartCount}
      unreadCount={unreadCount}
      isOnPhoto={isOnPhoto}
      onPressCart={() => router.push('/cart')}
      onPressNotifications={() => router.push('/notifications')}
    />
  );
  const plainTopBar = (
    <View style={[styles.plainTop, { paddingTop: insets.top + spacing.sm }]}>
      {renderTopBar(false)}
    </View>
  );

  let top: ReactNode;
  let body: ReactNode;
  if (data && slides.length > 0) {
    top = <HomeHero slides={slides} topBar={renderTopBar(true)} />;
  } else if (isPending) {
    top = <HomeHeroSkeleton topBar={renderTopBar(false)} />;
  } else {
    top = plainTopBar;
  }
  if (data) {
    body = isHomeEmpty(data) ? (
      <EmptyState
        icon="book-open"
        title={t('emptyTitle')}
        message={t('emptyMessage')}
        actionLabel={t('refresh')}
        onAction={() => void handleRefresh()}
      />
    ) : (
      <HomeSections home={data} onToggleBookmark={handleToggleBookmark} />
    );
  } else if (isPending) {
    body = <HomeSkeleton />;
  } else if (isError) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.screen}>
      {isFocused && slides.length > 0 ? <StatusBar style="light" /> : null}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: clearance + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <BrandRefreshControl isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {top}
        <View style={styles.sections}>{body}</View>
      </ScrollView>
    </View>
  );
}

/** SC-04 Home: the phone layout below 768 dp wide, the Netflix-style web layout from there up. */
export function HomeScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <HomeDesktopScreen /> : <HomePhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  plainTop: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  sections: { marginTop: layout.sectionGap, gap: layout.sectionGap },
}));
