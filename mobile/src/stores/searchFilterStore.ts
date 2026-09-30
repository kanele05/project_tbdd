import { create } from 'zustand';

import type { CourseListParams, CourseSort } from '@/types/api';

export type PriceType = 'all' | 'free' | 'paid';

export type SearchFilterValues = {
  /** Selected category ids (multi-select in SC-07). */
  categoryIds: string[];
  price: PriceType;
  /** Custom price range in cents (only used when `price === 'paid'`). */
  minPriceCents: number | null;
  maxPriceCents: number | null;
  /** Minimum average rating (4.5, 4.0, 3.5, 3.0) or null for any. */
  minRating: number | null;
  sort: CourseSort;
};

type SearchFilterState = SearchFilterValues & {
  setCategoryIds: (categoryIds: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  setPrice: (price: PriceType) => void;
  setPriceRange: (minPriceCents: number | null, maxPriceCents: number | null) => void;
  setMinRating: (minRating: number | null) => void;
  setSort: (sort: CourseSort) => void;
  /** Replace all values at once (used by the "Apply" button of the Filter modal). */
  apply: (values: Partial<SearchFilterValues>) => void;
  reset: () => void;
};

export const DEFAULT_SORT: CourseSort = 'popular';

export const INITIAL_SEARCH_FILTERS: SearchFilterValues = {
  categoryIds: [],
  price: 'all',
  minPriceCents: null,
  maxPriceCents: null,
  minRating: null,
  sort: DEFAULT_SORT,
};

/**
 * Temporary search filters (SC-07). Client state only - results come from TanStack Query with
 * the params built by `selectFilterParams`.
 */
export const useSearchFilterStore = create<SearchFilterState>()((set) => ({
  ...INITIAL_SEARCH_FILTERS,
  setCategoryIds: (categoryIds) => set({ categoryIds }),
  toggleCategory: (categoryId) =>
    set((state) => ({
      categoryIds: state.categoryIds.includes(categoryId)
        ? state.categoryIds.filter((id) => id !== categoryId)
        : [...state.categoryIds, categoryId],
    })),
  setPrice: (price) =>
    set(price === 'paid' ? { price } : { price, minPriceCents: null, maxPriceCents: null }),
  setPriceRange: (minPriceCents, maxPriceCents) => set({ minPriceCents, maxPriceCents }),
  setMinRating: (minRating) => set({ minRating }),
  setSort: (sort) => set({ sort }),
  apply: (values) => set({ ...INITIAL_SEARCH_FILTERS, ...values }),
  reset: () => set({ ...INITIAL_SEARCH_FILTERS }),
}));

/** Map the filter values to `GET /courses` query params (money in cents, categories comma-joined). */
export function buildFilterParams(values: SearchFilterValues): CourseListParams {
  const params: CourseListParams = { sort: values.sort };
  if (values.categoryIds.length > 0) params.categoryId = values.categoryIds.join(',');
  if (values.price === 'free') params.isFree = true;
  if (values.price === 'paid') {
    params.isFree = false;
    if (values.minPriceCents != null) params.minPrice = values.minPriceCents;
    if (values.maxPriceCents != null) params.maxPrice = values.maxPriceCents;
  }
  if (values.minRating != null) params.minRating = values.minRating;
  return params;
}

/** Number of active filters (badge on the Filter button). Sorting counts only when non-default. */
export function countActiveFilters(values: SearchFilterValues): number {
  let count = 0;
  if (values.categoryIds.length > 0) count += 1;
  if (values.price !== 'all') count += 1;
  if (values.minRating != null) count += 1;
  if (values.sort !== DEFAULT_SORT) count += 1;
  return count;
}
