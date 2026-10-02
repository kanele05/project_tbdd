import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { PAGE_SIZE, STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildFilterParams,
  useSearchFilterStore,
  type SearchFilterValues,
} from '@/stores/searchFilterStore';
import type { CourseListParams, CourseSummary, Paginated } from '@/types/api';

import { searchApi } from './api';

/** Params of the list query: `page`/`limit` are driven by the infinite query itself. */
export type CoursesInfiniteParams = Omit<CourseListParams, 'page' | 'limit'>;

type CoursesPage = Paginated<CourseSummary>;

export type UseCoursesInfiniteResult = UseInfiniteQueryResult<InfiniteData<CoursesPage>, Error> & {
  /** Courses of all loaded pages, de-duplicated (a page shift can repeat an item). */
  courses: CourseSummary[];
  /** `meta.total` of the first page - the "{total} Results" number. */
  total: number | undefined;
};

/** Merge the pages of an infinite list, dropping repeated ids. */
export function flattenCourses(pages: readonly CoursesPage[] | undefined): CourseSummary[] {
  const seen = new Set<string>();
  const result: CourseSummary[] = [];
  for (const page of pages ?? []) {
    for (const course of page.data) {
      if (seen.has(course.id)) continue;
      seen.add(course.id);
      result.push(course);
    }
  }
  return result;
}

/**
 * `GET /courses` as an infinite list (20 per page) - Search results (SC-06) and Course list
 * (SC-08). Key `['courses','list',params]`, not persisted, staleTime 2 min (PLAN.md §10).
 */
export function useCoursesInfinite(
  params: CoursesInfiniteParams,
  options: { enabled?: boolean } = {},
): UseCoursesInfiniteResult {
  const query = useInfiniteQuery({
    queryKey: queryKeys.coursesList(params),
    queryFn: ({ pageParam }) => searchApi.courses({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: STALE_TIME.courseList,
    enabled: options.enabled ?? true,
  });

  const pages = query.data?.pages;
  const courses = useMemo(() => flattenCourses(pages), [pages]);
  return { ...query, courses, total: pages?.[0]?.meta.total };
}

/** `GET /categories` - persisted, staleTime 24 h. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: searchApi.categories,
    staleTime: STALE_TIME.categories,
  });
}

/** `GET /tags/hot` - persisted, staleTime 24 h. */
export function useHotTags() {
  return useQuery({
    queryKey: queryKeys.hotTags(),
    queryFn: searchApi.hotTags,
    staleTime: STALE_TIME.hotTags,
  });
}

/** Returns `value` after it stayed unchanged for `delayMs` (used by the 300 ms result count). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Number of courses matching the Filter draft (`GET /courses?...&limit=1` -> `meta.total`).
 * Keeps the previous number while a new one loads so the Apply button does not flicker.
 */
export function useFilterResultCount(
  params: CoursesInfiniteParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.coursesCount(params),
    queryFn: async () => (await searchApi.courses({ ...params, page: 1, limit: 1 })).meta.total,
    staleTime: STALE_TIME.courseList,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** The currently applied filters (values only, no actions) from `searchFilterStore`. */
export function useAppliedFilters(): SearchFilterValues {
  return useSearchFilterStore(
    useShallow((state): SearchFilterValues => ({
      categoryIds: state.categoryIds,
      price: state.price,
      minPriceCents: state.minPriceCents,
      maxPriceCents: state.maxPriceCents,
      minRating: state.minRating,
      sort: state.sort,
    })),
  );
}

/** `GET /courses` params for a keyword + filters (the `q` key is omitted when there is no keyword). */
export function buildSearchParams(
  keyword: string,
  filters: SearchFilterValues,
): CoursesInfiniteParams {
  const params: CoursesInfiniteParams = { ...buildFilterParams(filters) };
  const trimmed = keyword.trim();
  if (trimmed) params.q = trimmed;
  return params;
}
