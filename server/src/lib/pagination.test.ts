import { buildPaginationMeta, getPagination, paginationQuery } from './pagination';

describe('getPagination', () => {
  it('defaults to page 1, limit 20', () => {
    expect(getPagination()).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
    expect(getPagination({})).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('computes skip/take from page and limit', () => {
    expect(getPagination({ page: '3', limit: '10' })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
      take: 10,
    });
  });

  it('caps limit at 50 and falls back on invalid values', () => {
    expect(getPagination({ limit: 500 }).limit).toBe(50);
    expect(getPagination({ page: -4, limit: 'abc' })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    });
  });
});

describe('buildPaginationMeta', () => {
  it('computes totalPages with ceil', () => {
    expect(buildPaginationMeta(45, { page: 2, limit: 20 })).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('returns 0 totalPages when there are no items', () => {
    expect(buildPaginationMeta(0, { page: 1, limit: 20 }).totalPages).toBe(0);
  });
});

describe('paginationQuery schema', () => {
  it('coerces strings and applies defaults', () => {
    expect(paginationQuery.parse({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
    expect(paginationQuery.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('rejects limit above 50 and page below 1', () => {
    expect(paginationQuery.safeParse({ limit: '51' }).success).toBe(false);
    expect(paginationQuery.safeParse({ page: '0' }).success).toBe(false);
  });
});
