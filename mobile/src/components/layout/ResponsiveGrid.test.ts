import { getColumnCount, getItemWidth } from './ResponsiveGrid';

describe('getColumnCount', () => {
  it('fits as many columns as the width allows, between 1 and the maximum', () => {
    expect(getColumnCount(0, 220, 16, 6)).toBe(1);
    expect(getColumnCount(200, 220, 16, 6)).toBe(1);
    expect(getColumnCount(456, 220, 16, 6)).toBe(2);
    expect(getColumnCount(1200, 220, 16, 6)).toBe(5);
    expect(getColumnCount(5000, 220, 16, 6)).toBe(6);
  });
});

describe('getItemWidth', () => {
  it('never lets a full row overflow the measured width, so the last cell cannot wrap', () => {
    // 1440 px window, 4 % gutters: the container is 1324.8 px but onLayout may report 1325 (BUG-DISC-01).
    for (const width of [1324, 1324.8, 1325, 1056, 700]) {
      const columns = getColumnCount(width, 220, 16, 6);
      const item = getItemWidth(width, columns, 16);
      expect(columns * item + 16 * (columns - 1)).toBeLessThanOrEqual(Math.floor(width));
      expect(Number.isInteger(item)).toBe(true);
    }
    expect(getColumnCount(1325, 220, 16, 6)).toBe(5);
  });

  it('keeps cells wide enough to fill the row (at most one pixel per column lost)', () => {
    expect(getItemWidth(1324.8, 5, 16)).toBe(251);
    expect(getItemWidth(456, 2, 16)).toBe(219);
  });

  it('never returns less than 1', () => {
    expect(getItemWidth(0.5, 1, 16)).toBe(1);
  });
});
