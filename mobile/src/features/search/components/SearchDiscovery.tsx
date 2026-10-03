import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCardVerticalSkeleton } from '@/components/course';
import { SectionHeader, Skeleton } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { CourseCarousel } from '@/features/home/components/CourseCarousel';
import { useHome } from '@/features/home/hooks';
import { getErrorMessage } from '@/lib/appError';
import { layout, radius, spacing } from '@/theme';
import type { CategoryDto, CourseSummary, TagDto } from '@/types/api';

import { useCategories, useHotTags } from '../hooks';
import { openCourse, openCourseList } from '../navigation';
import { BrandRefreshControl } from './BrandRefreshControl';
import { CategoryRow } from './CategoryRow';
import { HotTopics } from './HotTopics';
import { InlineError } from './InlineError';

type SearchDiscoveryProps = {
  /** Called when a hot-topic chip is pressed: the screen fills the keyword and searches. */
  onPressTag: (tag: TagDto) => void;
};

type SectionProps = {
  title: string;
  onViewMore?: () => void;
  children: ReactNode;
  isPadded?: boolean;
};

function Section({ title, onViewMore, children, isPadded = true }: SectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} onViewMore={onViewMore} style={styles.sectionHeader} />
      <View style={isPadded ? styles.padded : null}>{children}</View>
    </View>
  );
}

function ChipsSkeleton() {
  return (
    <View style={styles.chips}>
      {[64, 52, 96, 76, 150, 110, 112].map((width, index) => (
        <Skeleton key={index} width={width} height={36} borderRadius={radius.pill} />
      ))}
    </View>
  );
}

/** SC-05 (search field empty): Hot topics, Categories and Recommended for you. */
export function SearchDiscovery({ onPressTag }: SearchDiscoveryProps) {
  const hotTags = useHotTags();
  const categories = useCategories();
  const home = useHome();
  const { toggleBookmark } = useToggleBookmark();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refetch: refetchTags } = hotTags;
  const { refetch: refetchCategories } = categories;
  const { refetch: refetchHome } = home;

  const handlePressCourse = useCallback((course: CourseSummary) => openCourse(course.id), []);
  const handleToggleBookmark = useCallback(
    (course: CourseSummary) => toggleBookmark(course.id, course.isBookmarked),
    [toggleBookmark],
  );
  const handlePressCategory = useCallback(
    (category: CategoryDto) => openCourseList({ categoryId: category.id, title: category.name }),
    [],
  );
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refetchTags(), refetchCategories(), refetchHome()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchTags, refetchCategories, refetchHome]);

  const recommended = home.data?.recommended ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={<BrandRefreshControl isRefreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {hotTags.isPending || hotTags.isError || (hotTags.data?.length ?? 0) > 0 ? (
        <Section title="Hot topics">
          {hotTags.isPending ? (
            <ChipsSkeleton />
          ) : hotTags.isError ? (
            <InlineError
              message={getErrorMessage(hotTags.error)}
              onRetry={() => void refetchTags()}
            />
          ) : (
            <HotTopics tags={hotTags.data ?? []} onPressTag={onPressTag} />
          )}
        </Section>
      ) : null}

      <Section title="Categories" onViewMore={() => openCourseList()}>
        {categories.isPending ? (
          <View style={styles.rows}>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} height={48} />
            ))}
          </View>
        ) : categories.isError ? (
          <InlineError
            message={getErrorMessage(categories.error)}
            onRetry={() => void refetchCategories()}
          />
        ) : (
          <View style={styles.rows}>
            {(categories.data ?? []).map((category) => (
              <CategoryRow key={category.id} category={category} onPress={handlePressCategory} />
            ))}
          </View>
        )}
      </Section>

      {home.isPending || recommended.length > 0 ? (
        <Section
          title="Recommended for you"
          onViewMore={() => openCourseList({ section: 'recommended' })}
          isPadded={false}
        >
          {home.isPending ? (
            <View style={[styles.cardsSkeleton, styles.padded]}>
              <CourseCardVerticalSkeleton />
              <CourseCardVerticalSkeleton />
            </View>
          ) : (
            <CourseCarousel
              courses={recommended}
              onPressCourse={handlePressCourse}
              onToggleBookmark={handleToggleBookmark}
            />
          )}
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xs, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  section: { gap: spacing.lg },
  sectionHeader: { paddingHorizontal: layout.screenPaddingX },
  padded: { paddingHorizontal: layout.screenPaddingX },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xs, rowGap: spacing.sm },
  rows: { gap: spacing.sm },
  cardsSkeleton: { flexDirection: 'row', gap: spacing.md, overflow: 'hidden' },
});
