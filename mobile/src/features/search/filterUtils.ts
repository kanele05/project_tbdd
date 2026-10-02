import type { SearchFilterValues } from '@/stores/searchFilterStore';
import type { CourseSort } from '@/types/api';

/** Minimum-rating chips of SC-07 (PLAN.md §7.3). */
export const RATING_OPTIONS = [4.5, 4.0, 3.5, 3.0] as const;

export const SORT_OPTIONS: readonly { value: CourseSort; label: string }[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const PRICE_RANGE_ERROR = 'Max must be greater than min';

/** Keep digits and at most one dot with at most 2 decimals ("12.345" -> "12.34"). */
export function sanitizeMoneyInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

/** "12.5" -> 1250 cents; an empty or invalid text -> null (no limit). */
export function dollarsToCents(text: string): number | null {
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** 5900 -> "59", 1250 -> "12.5"; null -> "". */
export function centsToDollars(cents: number | null): string {
  if (cents == null) return '';
  return String(cents / 100);
}

/** `true` when both limits are set and Max is below Min. */
export function hasPriceRangeError(values: SearchFilterValues): boolean {
  return (
    values.minPriceCents != null &&
    values.maxPriceCents != null &&
    values.maxPriceCents < values.minPriceCents
  );
}

/** Value equality of two filter sets (category order does not matter). */
export function isSameFilters(a: SearchFilterValues, b: SearchFilterValues): boolean {
  const sameCategories =
    a.categoryIds.length === b.categoryIds.length &&
    a.categoryIds.every((id) => b.categoryIds.includes(id));
  return (
    sameCategories &&
    a.price === b.price &&
    a.minPriceCents === b.minPriceCents &&
    a.maxPriceCents === b.maxPriceCents &&
    a.minRating === b.minRating &&
    a.sort === b.sort
  );
}

/** Label of the Apply button: "Apply (120 results)"; just "Apply" until the count is known. */
export function formatApplyLabel(total: number | undefined): string {
  if (total == null) return 'Apply';
  return `Apply (${total} ${total === 1 ? 'result' : 'results'})`;
}
