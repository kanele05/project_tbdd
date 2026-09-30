import {
  INITIAL_SEARCH_FILTERS,
  buildFilterParams,
  countActiveFilters,
  useSearchFilterStore,
} from './searchFilterStore';

describe('searchFilterStore', () => {
  beforeEach(() => {
    useSearchFilterStore.getState().reset();
  });

  it('toggles categories', () => {
    const store = useSearchFilterStore.getState();
    store.toggleCategory('design');
    store.toggleCategory('code');
    expect(useSearchFilterStore.getState().categoryIds).toEqual(['design', 'code']);

    useSearchFilterStore.getState().toggleCategory('design');
    expect(useSearchFilterStore.getState().categoryIds).toEqual(['code']);
  });

  it('drops the price range when switching away from Paid', () => {
    const store = useSearchFilterStore.getState();
    store.setPrice('paid');
    store.setPriceRange(1000, 5000);
    expect(useSearchFilterStore.getState().minPriceCents).toBe(1000);

    useSearchFilterStore.getState().setPrice('free');
    expect(useSearchFilterStore.getState().minPriceCents).toBeNull();
    expect(useSearchFilterStore.getState().maxPriceCents).toBeNull();
  });

  it('resets to the initial values', () => {
    const store = useSearchFilterStore.getState();
    store.setMinRating(4);
    store.setSort('newest');
    store.reset();

    const { categoryIds, price, minRating, sort } = useSearchFilterStore.getState();
    expect({ categoryIds, price, minRating, sort }).toEqual({
      categoryIds: [],
      price: 'all',
      minRating: null,
      sort: 'popular',
    });
  });

  it('builds GET /courses params (cents, comma-joined categories)', () => {
    expect(buildFilterParams(INITIAL_SEARCH_FILTERS)).toEqual({ sort: 'popular' });
    expect(
      buildFilterParams({
        categoryIds: ['a', 'b'],
        price: 'paid',
        minPriceCents: 1000,
        maxPriceCents: 9900,
        minRating: 4.5,
        sort: 'price_asc',
      }),
    ).toEqual({
      categoryId: 'a,b',
      isFree: false,
      minPrice: 1000,
      maxPrice: 9900,
      minRating: 4.5,
      sort: 'price_asc',
    });
    expect(buildFilterParams({ ...INITIAL_SEARCH_FILTERS, price: 'free' }).isFree).toBe(true);
  });

  it('counts active filters for the Filter button badge', () => {
    expect(countActiveFilters(INITIAL_SEARCH_FILTERS)).toBe(0);
    expect(
      countActiveFilters({
        ...INITIAL_SEARCH_FILTERS,
        categoryIds: ['a'],
        price: 'free',
        minRating: 4,
        sort: 'rating',
      }),
    ).toBe(4);
  });
});
