import { averageRating, buildReviewSummary } from './review.utils';

describe('averageRating', () => {
  it.each([
    [0, 0, 0],
    [5, 1, 5],
    [13, 3, 4.3], // 4.33
    [14, 3, 4.7], // 4.66
    [17, 4, 4.3], // 4.25 -> làm tròn .5 lên như ROUND của PostgreSQL
    [87, 20, 4.4], // 4.35 (số thực nhị phân dễ làm tròn xuống nhầm thành 4.3)
    [29, 10, 2.9],
  ])('sum %i / count %i = %f', (sum, count, expected) => {
    expect(averageRating(sum, count)).toBe(expected);
  });
});

describe('buildReviewSummary', () => {
  it('returns zeros for a course without reviews', () => {
    expect(buildReviewSummary([])).toEqual({
      avg: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('fills missing star levels with 0 and derives avg and count', () => {
    expect(
      buildReviewSummary([
        { rating: 5, count: 3 },
        { rating: 4, count: 2 },
        { rating: 1, count: 1 },
      ]),
    ).toEqual({
      avg: 4.0, // (15 + 8 + 1) / 6
      count: 6,
      distribution: { 1: 1, 2: 0, 3: 0, 4: 2, 5: 3 },
    });
  });

  it('ignores ratings outside 1-5', () => {
    expect(
      buildReviewSummary([
        { rating: 9, count: 4 },
        { rating: 3, count: 2 },
      ]),
    ).toEqual({
      avg: 3,
      count: 2,
      distribution: { 1: 0, 2: 0, 3: 2, 4: 0, 5: 0 },
    });
  });
});
