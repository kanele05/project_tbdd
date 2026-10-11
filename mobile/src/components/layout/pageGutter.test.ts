import { PAGE_MAX_WIDTH } from './desktopLayout';
import { getPageGutter, getRailMetrics } from './pageGutter';

describe('getPageGutter', () => {
  it('is 4 % of the window width up to the page maximum', () => {
    expect(getPageGutter(0)).toBe(0);
    expect(getPageGutter(1000)).toBe(40);
    expect(getPageGutter(PAGE_MAX_WIDTH)).toBe(58);
  });

  it('adds the centering margin once the window is wider than the page', () => {
    expect(getPageGutter(1920)).toBe(Math.round(240 + 1920 * 0.04));
  });
});

describe('getRailMetrics', () => {
  it('shows 6 cards at 1440 and fewer on narrower windows', () => {
    expect(getRailMetrics(1440, 14).visible).toBe(6);
    expect(getRailMetrics(1280, 14).visible).toBe(5);
    expect(getRailMetrics(1024, 14).visible).toBe(4);
    expect(getRailMetrics(800, 14).visible).toBe(3);
  });

  it('fits all visible cards and the gaps between the gutters', () => {
    const { visible, gutter, itemWidth } = getRailMetrics(1440, 14);
    expect(itemWidth * visible + 14 * (visible - 1)).toBeLessThanOrEqual(1440 - gutter * 2);
    expect(itemWidth).toBeGreaterThan(200);
  });

  it('adds extra columns for compact rows', () => {
    expect(getRailMetrics(1440, 14, 1).visible).toBe(7);
  });
});
