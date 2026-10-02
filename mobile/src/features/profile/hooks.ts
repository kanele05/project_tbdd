import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';

import { STALE_TIME } from '@/constants/config';
import { flattenCourses } from '@/features/search/hooks';
import { queryKeys } from '@/lib/queryKeys';

import { profileApi } from './api';

/** Re-run `refetch` every time the screen regains focus (not on the first focus). */
function useRefetchOnFocus(refetch: () => unknown): void {
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );
}

/** `GET /me/stats` - staleTime 0, persisted; also refreshed whenever the Profile tab is focused. */
export function useMeStats() {
  const query = useQuery({
    queryKey: queryKeys.meStats(),
    queryFn: profileApi.stats,
    staleTime: STALE_TIME.meStats,
  });
  useRefetchOnFocus(query.refetch);
  return query;
}

/**
 * `GET /me/bookmarks` (infinite, 20 per page) - the Saved courses list of the Profile.
 * The bookmark hook edits this cache optimistically (see `features/bookmark`).
 */
export function useBookmarks() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.meBookmarks(),
    queryFn: ({ pageParam }) => profileApi.bookmarks(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: STALE_TIME.meBookmarks,
  });
  const pages = query.data?.pages;
  const courses = useMemo(() => flattenCourses(pages), [pages]);
  return { ...query, courses };
}
