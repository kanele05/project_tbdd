import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTabBarClearance } from '@/components/FloatingTabBar';
import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { countActiveFilters } from '@/stores/searchFilterStore';
import { makeStyles, spacing } from '@/theme';
import type { TagDto } from '@/types/api';

import { CourseResults } from '../components/CourseResults';
import { NoResults } from '../components/NoResults';
import { SearchDiscovery } from '../components/SearchDiscovery';
import { SearchTopBar } from '../components/SearchTopBar';
import { SortChips } from '../components/SortChips';
import { buildSearchParams, useAppliedFilters } from '../hooks';
import { useRecentSearches } from '../recentSearches';
import { SearchDesktopScreen } from './SearchDesktopScreen';

/**
 * SC-05/06 Search tab on phones: "discovery" mode while there is no keyword and no filter,
 * otherwise the "results" mode. Typing is debounced 400 ms; the keyboard's search key searches
 * immediately.
 */
function SearchPhoneScreen() {
  const themed = useStyles();
  const clearance = useTabBarClearance();
  const [text, setText] = useState('');
  const [keyword, setKeyword] = useState('');
  const filters = useAppliedFilters();
  const filterCount = countActiveFilters(filters);
  const addRecent = useRecentSearches((state) => state.add);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === keyword) return;
    // Clearing the field leaves results at once; typing waits for a pause.
    const delay = trimmed === '' ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => setKeyword(trimmed), delay);
    return () => clearTimeout(timer);
  }, [text, keyword]);

  const searchFor = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setText(trimmed);
      setKeyword(trimmed);
      addRecent(trimmed);
    },
    [addRecent],
  );
  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setKeyword(trimmed);
      addRecent(trimmed);
    },
    [addRecent],
  );
  const handlePressTag = useCallback((tag: TagDto) => searchFor(tag.name), [searchFor]);
  const handlePressFilter = useCallback(() => {
    router.push({ pathname: '/search-filter', params: keyword ? { q: keyword } : {} });
  }, [keyword]);

  const params = useMemo(() => buildSearchParams(keyword, filters), [keyword, filters]);
  const isResultsMode = keyword !== '' || filterCount > 0;
  const listPadding = useMemo(() => ({ paddingBottom: clearance + spacing.xxxl }), [clearance]);

  return (
    <View style={themed.screen}>
      <SearchTopBar
        value={text}
        onChangeText={setText}
        onSubmit={handleSubmit}
        filterCount={filterCount}
        onPressFilter={handlePressFilter}
      />
      {isResultsMode ? (
        <CourseResults
          params={params}
          contentContainerStyle={listPadding}
          headerExtra={<SortChips />}
          emptyState={<NoResults onPressTag={handlePressTag} />}
        />
      ) : (
        <SearchDiscovery onPressTag={handlePressTag} onPressKeyword={searchFor} />
      )}
    </View>
  );
}

/** SC-05/06 Search: the phone layout below 768 dp wide, the poster grid on the wide web layout. */
export function SearchScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <SearchDesktopScreen /> : <SearchPhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));
