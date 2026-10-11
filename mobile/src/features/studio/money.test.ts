import { centsToUsdText, parseUsdToCents } from './money';

describe('parseUsdToCents', () => {
  it('converts dollars to cents', () => {
    expect(parseUsdToCents('29.99')).toBe(2999);
    expect(parseUsdToCents('30')).toBe(3000);
    expect(parseUsdToCents('$12.5')).toBe(1250);
    expect(parseUsdToCents('29,5')).toBe(2950);
    expect(parseUsdToCents('0')).toBe(0);
  });

  it('uses the fallback for an empty field', () => {
    expect(parseUsdToCents('')).toBe(0);
    expect(parseUsdToCents('  ', 7)).toBe(7);
  });

  it('gives NaN for junk, 3 decimals and anything above $999.99', () => {
    for (const bad of ['abc', '1.234', '-5', '1e3', '1000', '999.995']) {
      expect(parseUsdToCents(bad)).toBeNaN();
    }
    expect(parseUsdToCents('999.99')).toBe(99999);
  });
});

describe('centsToUsdText', () => {
  it('formats the editable text', () => {
    expect(centsToUsdText(2999)).toBe('29.99');
    expect(centsToUsdText(3000)).toBe('30');
    expect(centsToUsdText(0)).toBe('0');
    expect(centsToUsdText(null)).toBe('');
    expect(centsToUsdText(undefined)).toBe('');
  });
});
