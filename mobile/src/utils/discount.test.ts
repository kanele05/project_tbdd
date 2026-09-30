import { calcDiscountPercent, getCourseBadge } from './discount';

describe('calcDiscountPercent', () => {
  it('rounds the discount percentage', () => {
    expect(calcDiscountPercent(5900, 7375)).toBe(20);
    expect(calcDiscountPercent(5900, 102000)).toBe(94);
  });

  it('returns 0 without a real discount', () => {
    expect(calcDiscountPercent(5900, null)).toBe(0);
    expect(calcDiscountPercent(5900, 5900)).toBe(0);
    expect(calcDiscountPercent(5900, 0)).toBe(0);
  });
});

describe('getCourseBadge', () => {
  const base = { badge: null, discountPercent: null, priceCents: 5900, originalPriceCents: null };

  it('returns null when there is no badge', () => {
    expect(getCourseBadge(base)).toBeNull();
  });

  it('returns Best-seller', () => {
    expect(getCourseBadge({ ...base, badge: 'BEST_SELLER' })).toEqual({
      kind: 'BEST_SELLER',
      label: 'Best-seller',
    });
  });

  it('returns "{x}% Off" from the server percentage', () => {
    expect(getCourseBadge({ ...base, badge: 'DISCOUNT', discountPercent: 20 })).toEqual({
      kind: 'DISCOUNT',
      label: '20% Off',
    });
  });

  it('recomputes the percentage when the server omitted it', () => {
    expect(getCourseBadge({ ...base, badge: 'DISCOUNT', originalPriceCents: 7375 })).toEqual({
      kind: 'DISCOUNT',
      label: '20% Off',
    });
  });

  it('hides a discount badge that has no real discount', () => {
    expect(getCourseBadge({ ...base, badge: 'DISCOUNT' })).toBeNull();
  });
});
