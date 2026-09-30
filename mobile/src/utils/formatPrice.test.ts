import { formatPrice, formatPriceOrFree } from './formatPrice';

describe('formatPrice', () => {
  it('drops decimals for whole-dollar amounts', () => {
    expect(formatPrice(5900)).toBe('$59');
    expect(formatPrice(100)).toBe('$1');
  });

  it('keeps two decimals when there are cents', () => {
    expect(formatPrice(7375)).toBe('$73.75');
    expect(formatPrice(1905)).toBe('$19.05');
    expect(formatPrice(5910)).toBe('$59.10');
  });

  it('groups thousands', () => {
    expect(formatPrice(102000)).toBe('$1,020');
    expect(formatPrice(123456789)).toBe('$1,234,567.89');
  });

  it('handles zero and invalid input', () => {
    expect(formatPrice(0)).toBe('$0');
    expect(formatPrice(Number.NaN)).toBe('$0');
    expect(formatPrice(-500)).toBe('$0');
  });
});

describe('formatPriceOrFree', () => {
  it('returns Free for a zero price', () => {
    expect(formatPriceOrFree(0)).toBe('Free');
  });

  it('formats paid prices', () => {
    expect(formatPriceOrFree(3900)).toBe('$39');
  });
});
