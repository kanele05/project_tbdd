import { getColumnCount } from './ResponsiveGrid';

describe('getColumnCount', () => {
  it('fits as many columns as the width allows, between 1 and the maximum', () => {
    expect(getColumnCount(0, 220, 16, 6)).toBe(1);
    expect(getColumnCount(200, 220, 16, 6)).toBe(1);
    expect(getColumnCount(456, 220, 16, 6)).toBe(2);
    expect(getColumnCount(1200, 220, 16, 6)).toBe(5);
    expect(getColumnCount(5000, 220, 16, 6)).toBe(6);
  });
});
