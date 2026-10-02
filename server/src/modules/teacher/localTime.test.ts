import { formatLocalTime } from './localTime';

describe('formatLocalTime (BR-16)', () => {
  const noonUtc = new Date('2026-10-02T12:00:00Z');

  it('formats the current time of the timezone as hh:mm AM/PM', () => {
    expect(formatLocalTime('America/New_York', noonUtc)).toBe('08:00 AM'); // UTC-4 (DST)
    expect(formatLocalTime('Europe/Berlin', noonUtc)).toBe('02:00 PM'); // UTC+2 (DST)
    expect(formatLocalTime('Asia/Kolkata', noonUtc)).toBe('05:30 PM');
  });

  it('handles midnight and noon as 12 AM / 12 PM', () => {
    expect(formatLocalTime('UTC', new Date('2026-10-02T00:05:00Z'))).toBe('12:05 AM');
    expect(formatLocalTime('UTC', new Date('2026-10-02T12:30:00Z'))).toBe('12:30 PM');
  });

  it('returns null for a missing or invalid timezone', () => {
    expect(formatLocalTime(null, noonUtc)).toBeNull();
    expect(formatLocalTime(undefined, noonUtc)).toBeNull();
    expect(formatLocalTime('', noonUtc)).toBeNull();
    expect(formatLocalTime('Mars/Olympus', noonUtc)).toBeNull();
  });

  it('uses a plain space before AM/PM (no narrow no-break space)', () => {
    expect(formatLocalTime('UTC', noonUtc)).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
  });
});
