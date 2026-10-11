import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { CourseCardDesktop } from '@/components/course';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { AppText, HoverRail, SearchBar } from '@/components/ui';
import { HomeDesktopSkeleton } from '@/features/home/components/HomeDesktopSkeleton';
import { useHome } from '@/features/home/hooks';
import { useTranslation } from '@/i18n';
import { countActiveFilters } from '@/stores/searchFilterStore';
import { layout, spacing } from '@/theme';
import type { CourseSummary, TagDto } from '@/types/api';

import { DesktopCourseResults } from '../components/DesktopCourseResults';
import { DesktopFilterBar } from '../components/DesktopFilterBar';
import {
  CategoriesSection,
  HotTopicsSection,
  RecentSection,
} from '../components/DiscoverySections';
import { NoResults } from '../components/NoResults';
import { buildSearchParams, useAppliedFilters } from '../hooks';
import { openCourseList } from '../navigation';
import { useQuickCardActions } from '../useQuickCardActions';
import { useSearchKeyword } from '../useSearchKeyword';

const SEARCH_FIELD_MAX_WIDTH = 560;

function firstParam(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? '';
}

function courseKey(course: CourseSummary): string {
  return course.id;
}

/** "Recommended for you" row of the explore state. */
function RecommendedRow({ width }: { width: number }) {
  const { t } = useTranslation('search');
  const { data, isPending } = useHome();
  const { onPress, onToggleBookmark, onAddToCart } = useQuickCardActions();
  const renderItem = useCallback(
    (course: CourseSummary, _index: number, itemWidth: number) => (
      <CourseCardDesktop
        course={course}
        width={itemWidth}
        onPress={onPress}
        onToggleBookmark={onToggleBookmark}
        onAddToCart={onAddToCart}
      />
    ),
    [onAddToCart, onPress, onToggleBookmark],
  );
  if (isPending) return <HomeDesktopSkeleton width={width} rows={1} />;
  const recommended = data?.recommended ?? [];
  if (recommended.length === 0) return null;
  return (
    <HoverRail
      title={t('recommended')}
      onViewMore={() => openCourseList({ section: 'recommended' })}
      data={recommended}
      keyExtractor={courseKey}
      renderItem={renderItem}
    />
  );
}

/**
 * Search on wide screens (PLAN §2.5): title + search field + a horizontal filter toolbar, then a
 * poster grid of results; with no keyword and no filter the explore state (recent searches, hot
 * topics, categories) and a "Recommended" row. Reads `?q=` so the top navigation's search box
 * lands here with the keyword filled in.
 */
export function SearchDesktopScreen() {
  const { t } = useTranslation('search');
  const { width } = useWindowDimensions();
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  const { text, setText, keyword, searchFor, submit } = useSearchKeyword(firstParam(q));
  const filters = useAppliedFilters();
  const isResultsMode = keyword !== '' || countActiveFilters(filters) > 0;
  const params = useMemo(() => buildSearchParams(keyword, filters), [keyword, filters]);
  const handlePressTag = useCallback((tag: TagDto) => searchFor(tag.name), [searchFor]);

  const toolbar = (
    <View>
      <View style={styles.titleRow}>
        <AppText variant="h1" accessibilityRole="header">
          {t('title')}
        </AppText>
        <SearchBar value={text} onChangeText={setText} onSubmit={submit} style={styles.search} />
      </View>
      <DesktopFilterBar />
    </View>
  );

  if (isResultsMode) {
    return (
      <DesktopCourseResults
        params={params}
        topContent={toolbar}
        emptyState={<NoResults onPressTag={handlePressTag} />}
        testID="search-results-scroll"
      />
    );
  }
  return (
    <ScrollView
      contentContainerStyle={styles.explore}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <PageContainer>
        {toolbar}
        {/* The discovery sections pad themselves by one phone gutter: cancel it inside the page. */}
        <View style={styles.sections}>
          <RecentSection onPressKeyword={searchFor} />
          <HotTopicsSection onPressTag={handlePressTag} />
          <CategoriesSection />
        </View>
      </PageContainer>
      <RecommendedRow width={width} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.xl,
    rowGap: spacing.md,
    marginBottom: spacing.lg,
  },
  search: { flexGrow: 1, flexBasis: 280, maxWidth: SEARCH_FIELD_MAX_WIDTH },
  explore: { paddingTop: DESKTOP_NAV_HEIGHT + spacing.xl, paddingBottom: spacing.huge },
  sections: {
    marginHorizontal: -layout.screenPaddingX,
    gap: layout.sectionGap,
    marginBottom: layout.sectionGap,
  },
});
