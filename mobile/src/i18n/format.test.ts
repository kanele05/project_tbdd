import { formatDate, formatFixed, formatNumber } from './format';
import { applyLanguage } from './index';

/** UI-03: numbers and dates follow the UI language (the price currency stays USD elsewhere). */

const DATE = '2026-10-20T12:00:00.000Z';

describe('formatNumber', () => {
  it('groups digits like the active language', async () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    await applyLanguage('vi');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('passes Intl options through', async () => {
    expect(formatNumber(0.256, { style: 'percent' })).toBe('26%');
    expect(formatNumber(4.5, { minimumFractionDigits: 1 })).toBe('4.5');
    await applyLanguage('vi');
    expect(formatNumber(4.5, { minimumFractionDigits: 1 })).toBe('4,5');
  });

  it('shows 0 for values that are not finite', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('falls back to the plain number when Intl cannot format', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new RangeError('Incorrect locale information provided');
    });
    expect(formatNumber(1234.5)).toBe('1234.5');
    spy.mockRestore();
  });
});

describe('formatFixed', () => {
  it('uses a fixed number of fraction digits with the language decimal mark', async () => {
    expect(formatFixed(73.75, 2)).toBe('73.75');
    expect(formatFixed(59, 2)).toBe('59.00');
    expect(formatFixed(1020, 0)).toBe('1,020');
    await applyLanguage('vi');
    expect(formatFixed(73.75, 2)).toBe('73,75');
    expect(formatFixed(1020, 0)).toBe('1.020');
  });
});

describe('formatDate', () => {
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeZone: 'UTC' };

  it('formats a medium date in English', () => {
    expect(formatDate(DATE, options)).toBe('Oct 20, 2026');
  });

  it('formats the same date in Vietnamese', async () => {
    await applyLanguage('vi');
    const text = formatDate(DATE, options);
    expect(text).toContain('2026');
    expect(text).toContain('20');
    expect(text).not.toBe('Oct 20, 2026');
  });

  it('accepts a Date, a timestamp and an ISO string alike', () => {
    const expected = formatDate(DATE, options);
    expect(formatDate(new Date(DATE), options)).toBe(expected);
    expect(formatDate(Date.parse(DATE), options)).toBe(expected);
  });

  it('has a sensible default format', () => {
    expect(formatDate(DATE)).toMatch(/Oct/);
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate(Number.NaN)).toBe('');
  });

  it('falls back to the ISO date when Intl cannot format', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('Incorrect locale information provided');
    });
    expect(formatDate(DATE)).toBe('2026-10-20');
    spy.mockRestore();
  });
});
