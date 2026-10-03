import { useQueryClient } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCardHorizontal } from '@/components/course';
import { EmptyState, ErrorState, SectionHeader } from '@/components/ui';
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
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { colors, layout, spacing } from '@/theme';
import type { BannerDto, CategoryDto, CourseSummary, HomeResponse } from '@/types/api';

import { BannerCarousel } from '../components/BannerCarousel';
import { CategoryGrid } from '../components/CategoryGrid';
import { CourseCarousel } from '../components/CourseCarousel';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { TeacherCarousel } from '../components/TeacherCarousel';
import { getGreeting } from '../greeting';
import { useHome } from '../hooks';

const HOME_STRINGS = {
  categories: 'Categories',
  popular: 'Popular courses',
  recommended: 'Recommended for you',
  inspires: 'Course that inspires',
  topTeachers: 'Top teachers',
  refresh: 'Refresh',
  emptyTitle: 'No courses to show yet',
  emptyMessage: 'New courses are added regularly. Pull down to refresh or check back soon.',
} as const;

type SectionProps = {
  title: string;
  onViewMore: () => void;
  /** Design: the "Categories" link is 14 px, the other sections use 12 px. */
  viewMoreSize?: 'sm' | 'md';
  children: ReactNode;
};

function Section({ title, onViewMore, viewMoreSize, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title={title}
        onViewMore={onViewMore}
        viewMoreSize={viewMoreSize}
        style={styles.sectionHeader}
      />
      {children}
    </View>
  );
}

type HomeContentProps = {
  home: HomeResponse;
  onToggleBookmark: (course: CourseSummary) => void;
};

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

/** Success state of SC-04: every section is hidden when the server sent an empty list for it. */
function HomeContent({ home, onToggleBookmark }: HomeContentProps) {
  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handlePressBanner = useCallback((banner: BannerDto) => {
    if (banner.target.type === 'COURSE') openCourse(banner.target.id);
    else openCourseList({ categoryId: banner.target.id });
  }, []);
  const handlePressCategory = useCallback(
    (category: CategoryDto) => openCourseList({ categoryId: category.id, title: category.name }),
    [],
  );
  const carouselProps = { onPressCourse: handlePressCourse, onToggleBookmark };

  return (
    <>
      {home.banners.length > 0 ? (
        <BannerCarousel banners={home.banners} onPressBanner={handlePressBanner} />
      ) : null}
      {home.categories.length > 0 ? (
        <Section title={HOME_STRINGS.categories} onViewMore={openSearchTab} viewMoreSize="md">
          <CategoryGrid categories={home.categories} onPressCategory={handlePressCategory} />
        </Section>
      ) : null}
      {home.popular.length > 0 ? (
        <Section
          title={HOME_STRINGS.popular}
          onViewMore={() => openCourseList({ section: 'popular' })}
        >
          <CourseCarousel courses={home.popular} {...carouselProps} />
        </Section>
      ) : null}
      {home.recommended.length > 0 ? (
        <Section
          title={HOME_STRINGS.recommended}
          onViewMore={() => openCourseList({ section: 'recommended' })}
        >
          <CourseCarousel courses={home.recommended} {...carouselProps} />
        </Section>
      ) : null}
      {home.inspires.length > 0 ? (
        <Section
          title={HOME_STRINGS.inspires}
          onViewMore={() => openCourseList({ section: 'inspires' })}
        >
          <View style={styles.inspires}>
            {home.inspires.map((course) => (
              <CourseCardHorizontal
                key={course.id}
                course={course}
                onPress={handlePressCourse}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </View>
        </Section>
      ) : null}
      {home.topTeachers.length > 0 ? (
        <Section title={HOME_STRINGS.topTeachers} onViewMore={openTopTeachers}>
          <TeacherCarousel teachers={home.topTeachers} onPressTeacher={openTeacher} />
        </Section>
      ) : null}
    </>
  );
}

/** SC-04 Home: 1 request (`GET /home`), badges from the cart / notification hooks. */
export function HomeScreen() {
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
      // The header badges live in other queries: refresh them together with the home data.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refetch]);

  let body: ReactNode;
  if (data) {
    body = isHomeEmpty(data) ? (
      <EmptyState
        icon="book-open"
        title={HOME_STRINGS.emptyTitle}
        message={HOME_STRINGS.emptyMessage}
        actionLabel={HOME_STRINGS.refresh}
        onAction={() => void handleRefresh()}
      />
    ) : (
      <HomeContent home={data} onToggleBookmark={handleToggleBookmark} />
    );
  } else if (isPending) {
    body = <HomeSkeleton />;
  } else if (isError) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.screen}>
      {isFocused ? <StatusBar style="light" /> : null}
      <HomeHeader
        greeting={getGreeting(fullName)}
        cartCount={cartCount}
        unreadCount={unreadCount}
        onPressCart={() => router.push('/cart')}
        onPressNotifications={() => router.push('/notifications')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <BrandRefreshControl isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxxl },
  // Design: ~12 dp between the section title and its content, ~36 dp between sections (the header
  // row adds 4 dp above and below the 24 dp title line).
  section: { gap: spacing.sm },
  sectionHeader: { paddingHorizontal: layout.screenPaddingX },
  inspires: { gap: spacing.lg, paddingHorizontal: layout.screenPaddingX },
});
