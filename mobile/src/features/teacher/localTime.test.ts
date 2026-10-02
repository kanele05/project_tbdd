import { formatLocalTime, formatTeacherPlace } from './localTime';

// 13:30 UTC on 20 Oct 2026: New York is on daylight time (UTC-4), Ho Chi Minh is UTC+7.
const NOW = new Date('2026-10-20T13:30:00.000Z');

describe('formatLocalTime (BR-16)', () => {
  it('formats the time of the teacher timezone as hh:mm A', () => {
    expect(formatLocalTime('America/New_York', NOW)).toBe('09:30 AM');
    expect(formatLocalTime('Asia/Ho_Chi_Minh', NOW)).toBe('08:30 PM');
  });

  it('shows 12:xx AM just after midnight', () => {
    expect(formatLocalTime('America/New_York', new Date('2026-10-20T04:05:00.000Z'))).toBe(
      '12:05 AM',
    );
  });

  it('follows daylight saving changes', () => {
    // 15 Dec: New York is on standard time (UTC-5).
    expect(formatLocalTime('America/New_York', new Date('2026-12-15T13:30:00.000Z'))).toBe(
      '08:30 AM',
    );
  });

  it('returns null for a missing or unknown timezone', () => {
    expect(formatLocalTime(null, NOW)).toBeNull();
    expect(formatLocalTime(undefined, NOW)).toBeNull();
    expect(formatLocalTime('Mars/Olympus_Mons', NOW)).toBeNull();
  });
});

describe('formatTeacherPlace', () => {
  it('joins location and local time', () => {
    expect(formatTeacherPlace('New York', 'America/New_York', NOW)).toBe('New York - 09:30 AM');
  });

  it('falls back to whichever part is known', () => {
    expect(formatTeacherPlace('New York', null, NOW)).toBe('New York');
    expect(formatTeacherPlace(null, 'America/New_York', NOW)).toBe('09:30 AM');
    expect(formatTeacherPlace(null, null, NOW)).toBeNull();
  });
});
