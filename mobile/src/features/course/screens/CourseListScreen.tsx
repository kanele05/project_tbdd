import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ScreenHeader } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { CourseResults } from '@/features/search/components/CourseResults';
import { useCategories, type CoursesInfiniteParams } from '@/features/search/hooks';
import { openSearchTab } from '@/features/search/navigation';
import { colors, spacing } from '@/theme';
import type { CourseSection } from '@/types/api';

type CourseListRouteParams = {
  categoryId?: string | string[];
  section?: string | string[];
  teacherId?: string | string[];
  title?: string | string[];
};

const SECTION_TITLES: Record<CourseSection, string> = {
  popular: 'Popular courses',
  recommended: 'Recommended for you',
  inspires: 'Course that inspires',
};

const DEFAULT_TITLE = 'All courses';

function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

function isCourseSection(value: string | undefined): value is CourseSection {
  return value === 'popular' || value === 'recommended' || value === 'inspires';
}

/**
 * SC-08 Course list: courses of a category (`categoryId`), a Home "View more" group (`section`) or
 * a teacher (`teacherId`). Same layout and infinite list as the Search results.
 */
export function CourseListScreen() {
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams<CourseListRouteParams>();
  const categoryId = firstParam(routeParams.categoryId);
  const teacherId = firstParam(routeParams.teacherId);
  const sectionParam = firstParam(routeParams.section);
  const section = isCourseSection(sectionParam) ? sectionParam : undefined;
  const customTitle = firstParam(routeParams.title);

  const { data: categories } = useCategories();
  const categoryName = categories?.find((category) => category.id === categoryId)?.name;
  const title = customTitle ?? (section ? SECTION_TITLES[section] : categoryName) ?? DEFAULT_TITLE;

  const params = useMemo<CoursesInfiniteParams>(() => {
    const next: CoursesInfiniteParams = {};
    if (categoryId) next.categoryId = categoryId;
    if (teacherId) next.teacherId = teacherId;
    if (section) next.section = section;
    return next;
  }, [categoryId, teacherId, section]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <CourseResults
        params={params}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        emptyState={
          <EmptyState
            icon="book-open"
            title="No courses found"
            message="There are no courses here yet. Try exploring other topics."
            actionLabel={STRINGS.common.exploreCourses}
            onAction={openSearchTab}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
