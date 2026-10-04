import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCardVertical, CourseCardVerticalSkeleton } from '@/components/course';
import { useTabBarClearance } from '@/components/FloatingTabBar';
import { RailList } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useHome } from '@/features/home/hooks';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CourseSummary, TagDto } from '@/types/api';

import { useCategories, useHotTags } from '../hooks';
import { openCourse, openCourseList } from '../navigation';
import { BrandRefreshControl } from './BrandRefreshControl';
import { CategoriesSection, HotTopicsSection, RecentSection } from './DiscoverySections';

type SearchDiscoveryProps = {
  /** Called when a hot-topic chip is pressed: the screen fills the keyword and searches. */
  onPressTag: (tag: TagDto) => void;
  /** Called when a recent search is pressed. */
  onPressKeyword: (keyword: string) => void;
};

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

/** SC-05 (search field empty): recent searches, hot topics, categories and recommendations. */
export function SearchDiscovery({ onPressTag, onPressKeyword }: SearchDiscoveryProps) {
  const { t } = useTranslation('search');
  const clearance = useTabBarClearance();
  const { toggleBookmark } = useToggleBookmark();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refetch: refetchTags } = useHotTags();
  const { refetch: refetchCategories } = useCategories();
  const home = useHome();
  const { refetch: refetchHome } = home;

  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked),
    [toggleBookmark],
  );
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refetchTags(), refetchCategories(), refetchHome()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchTags, refetchCategories, refetchHome]);
  const renderRecommended = useCallback(
    (course: CourseSummary) => (
      <CourseCardVertical
        course={course}
        onPress={handlePressCourse}
        onToggleBookmark={handleToggleBookmark}
      />
    ),
    [handlePressCourse, handleToggleBookmark],
  );

  const recommended = home.data?.recommended ?? [];

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: clearance + spacing.xxxl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={<BrandRefreshControl isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <RecentSection onPressKeyword={onPressKeyword} />
      <HotTopicsSection onPressTag={onPressTag} />
      <CategoriesSection />
      {home.isPending ? (
        <View style={styles.cardsSkeleton}>
          <CourseCardVerticalSkeleton />
          <CourseCardVerticalSkeleton />
        </View>
      ) : recommended.length > 0 ? (
        <RailList
          title={t('recommended')}
          onViewMore={() => openCourseList({ section: 'recommended' })}
          data={recommended}
          keyExtractor={keyExtractor}
          renderItem={renderRecommended}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xs, gap: layout.sectionGap },
  cardsSkeleton: {
    flexDirection: 'row',
    gap: layout.railGap,
    paddingHorizontal: layout.screenPaddingX,
    overflow: 'hidden',
  },
});
