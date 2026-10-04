import { INITIAL_SEARCH_FILTERS, type SearchFilterValues } from '@/stores/searchFilterStore';

import {
  centsToDollars,
  dollarsToCents,
  hasPriceRangeError,
  isSameFilters,
  sanitizeMoneyInput,
  SORT_VALUES,
} from './filterUtils';

const base: SearchFilterValues = { ...INITIAL_SEARCH_FILTERS };

describe('sanitizeMoneyInput', () => {
  it('keeps digits and a single dot with two decimals', () => {
    expect(sanitizeMoneyInput('12a.3b4c5')).toBe('12.34');
    expect(sanitizeMoneyInput('1.2.3')).toBe('1.23');
    expect(sanitizeMoneyInput('abc')).toBe('');
    expect(sanitizeMoneyInput('150')).toBe('150');
  });
});

describe('dollarsToCents / centsToDollars', () => {
  it('converts USD text to integer cents without float noise', () => {
    expect(dollarsToCents('12.5')).toBe(1250);
    expect(dollarsToCents('0.29')).toBe(29);
    expect(dollarsToCents('200')).toBe(20000);
  });

  it('returns null for empty or invalid text', () => {
    expect(dollarsToCents('')).toBeNull();
    expect(dollarsToCents('.')).toBeNull();
  });

  it('formats cents back to a dollar text', () => {
    expect(centsToDollars(5900)).toBe('59');
    expect(centsToDollars(1250)).toBe('12.5');
    expect(centsToDollars(null)).toBe('');
  });
});

describe('hasPriceRangeError', () => {
  it('flags Max below Min only', () => {
    expect(hasPriceRangeError({ ...base, minPriceCents: 2000, maxPriceCents: 1000 })).toBe(true);
    expect(hasPriceRangeError({ ...base, minPriceCents: 1000, maxPriceCents: 1000 })).toBe(false);
    expect(hasPriceRangeError({ ...base, minPriceCents: 1000, maxPriceCents: null })).toBe(false);
  });
});

describe('isSameFilters', () => {
  it('ignores the order of selected categories', () => {
    expect(
      isSameFilters({ ...base, categoryIds: ['a', 'b'] }, { ...base, categoryIds: ['b', 'a'] }),
    ).toBe(true);
  });

  it('detects any other difference', () => {
    expect(isSameFilters(base, { ...base, categoryIds: ['a'] })).toBe(false);
    expect(isSameFilters(base, { ...base, price: 'free' })).toBe(false);
    expect(isSameFilters(base, { ...base, minRating: 4 })).toBe(false);
    expect(isSameFilters(base, { ...base, sort: 'newest' })).toBe(false);
    expect(isSameFilters(base, { ...base })).toBe(true);
  });
});

describe('SORT_VALUES', () => {
  it('lists every sort order once, the default first', () => {
    expect(SORT_VALUES[0]).toBe(INITIAL_SEARCH_FILTERS.sort);
    expect(new Set(SORT_VALUES).size).toBe(SORT_VALUES.length);
  });
});
