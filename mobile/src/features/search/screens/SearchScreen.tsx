import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { countActiveFilters } from '@/stores/searchFilterStore';
import { colors, layout, spacing } from '@/theme';
import type { TagDto } from '@/types/api';

import { CourseResults } from '../components/CourseResults';
import { HotTopics } from '../components/HotTopics';
import { SearchDiscovery } from '../components/SearchDiscovery';
import { SearchTopBar } from '../components/SearchTopBar';
import { buildSearchParams, useAppliedFilters, useHotTags } from '../hooks';

const EMPTY_TITLE = 'No courses found';
const EMPTY_MESSAGE = 'Try a different keyword or adjust your filters. You could also try:';

/** "No courses found" + hot-topic suggestions (PLAN.md SC-06). */
function NoResults({ onPressTag }: { onPressTag: (tag: TagDto) => void }) {
  const { data: tags } = useHotTags();
  return (
    <View style={styles.empty}>
      <EmptyState icon="search" title={EMPTY_TITLE} message={EMPTY_MESSAGE} />
      {tags && tags.length > 0 ? (
        <View style={styles.suggestions}>
          <HotTopics tags={tags} onPressTag={onPressTag} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * SC-05/06 Search tab: "discovery" mode while there is no keyword and no filter, otherwise the
 * "results" mode. Typing is debounced 400 ms; the keyboard's search key searches immediately.
 */
export function SearchScreen() {
  const [text, setText] = useState('');
  const [keyword, setKeyword] = useState('');
  const filters = useAppliedFilters();
  const filterCount = countActiveFilters(filters);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === keyword) return;
    // Clearing the field leaves results at once; typing waits for a pause.
    const delay = trimmed === '' ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => setKeyword(trimmed), delay);
    return () => clearTimeout(timer);
  }, [text, keyword]);

  const handleSubmit = useCallback((value: string) => setKeyword(value.trim()), []);
  const handlePressTag = useCallback((tag: TagDto) => {
    setText(tag.name);
    setKeyword(tag.name);
  }, []);
  const handlePressFilter = useCallback(() => {
    router.push({ pathname: '/search-filter', params: keyword ? { q: keyword } : {} });
  }, [keyword]);

  const params = useMemo(() => buildSearchParams(keyword, filters), [keyword, filters]);
  const isResultsMode = keyword !== '' || filterCount > 0;

  return (
    <View style={styles.screen}>
      <SearchTopBar
        value={text}
        onChangeText={setText}
        onSubmit={handleSubmit}
        filterCount={filterCount}
        onPressFilter={handlePressFilter}
      />
      {isResultsMode ? (
        <CourseResults params={params} emptyState={<NoResults onPressTag={handlePressTag} />} />
      ) : (
        <SearchDiscovery onPressTag={handlePressTag} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: { gap: spacing.sm },
  suggestions: { paddingHorizontal: layout.screenPaddingX },
});
