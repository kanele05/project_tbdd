import { useCallback, useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/config';

import { useRecentSearches } from './recentSearches';

/**
 * Text field + applied keyword of the wide Search page. Typing is debounced; Enter (or a recent /
 * hot-topic pick) searches at once. `initialQuery` is the `?q=` of the URL: when it changes (the
 * top navigation searched again) the field and the keyword follow it.
 */
export function useSearchKeyword(initialQuery: string) {
  const [text, setText] = useState(initialQuery);
  const [keyword, setKeyword] = useState(initialQuery.trim());
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  const addRecent = useRecentSearches((state) => state.add);

  if (initialQuery !== seenQuery) {
    setSeenQuery(initialQuery);
    setText(initialQuery);
    setKeyword(initialQuery.trim());
  }

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === keyword) return undefined;
    const timer = setTimeout(() => setKeyword(trimmed), trimmed === '' ? 0 : SEARCH_DEBOUNCE_MS);
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
  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setKeyword(trimmed);
      addRecent(trimmed);
    },
    [addRecent],
  );

  return { text, setText, keyword, searchFor, submit };
}
