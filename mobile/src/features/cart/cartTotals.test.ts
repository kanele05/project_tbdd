import { makeCourse } from '@/components/course/courseFixtures';

import { getCartTotals } from './cartTotals';

const item = (overrides: Parameters<typeof makeCourse>[0]) => ({
  course: makeCourse(overrides),
  addedAt: '2026-10-01T00:00:00Z',
});

describe('getCartTotals', () => {
  it('has no discount when nothing is on sale', () => {
    const totals = getCartTotals([item({ priceCents: 5900 }), item({ priceCents: 2500 })], 8400);
    expect(totals).toEqual({ subtotalCents: 8400, discountCents: 0, totalCents: 8400 });
  });

  it('uses the original price for the subtotal and reports the saving', () => {
    const totals = getCartTotals(
      [item({ priceCents: 5900 }), item({ priceCents: 2500, originalPriceCents: 5000 })],
      8400,
    );
    expect(totals).toEqual({ subtotalCents: 10900, discountCents: 2500, totalCents: 8400 });
  });

  it('never reports a negative discount', () => {
    const totals = getCartTotals([item({ priceCents: 1000 })], 1500);
    expect(totals.discountCents).toBe(0);
    expect(totals.subtotalCents).toBe(1500);
  });

  it('handles an empty cart', () => {
    expect(getCartTotals([], 0)).toEqual({ subtotalCents: 0, discountCents: 0, totalCents: 0 });
  });
});
