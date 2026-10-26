import { applyLanguage } from '@/i18n';

import { formatRelativeTime, formatRelativeTimeInline } from './formatRelativeTime';

const NOW = new Date('2026-10-20T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('returns "A day ago" for yesterday', () => {
    expect(formatRelativeTime('2026-10-19T09:00:00.000Z', NOW)).toBe('A day ago');
  });

  it('returns "5 days ago"', () => {
    expect(formatRelativeTime('2026-10-15T12:00:00.000Z', NOW)).toBe('5 days ago');
  });

  it('handles minutes and hours', () => {
    expect(formatRelativeTime('2026-10-20T11:30:00.000Z', NOW)).toBe('30 minutes ago');
    expect(formatRelativeTime('2026-10-20T09:00:00.000Z', NOW)).toBe('3 hours ago');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });

  it('keeps the first letter lowercase for text after a prefix (inline)', async () => {
    expect(formatRelativeTimeInline('2026-10-19T09:00:00.000Z', NOW)).toBe('a day ago');
    expect(formatRelativeTimeInline('not-a-date', NOW)).toBe('');
    await applyLanguage('vi');
    expect(formatRelativeTimeInline('2026-10-19T09:00:00.000Z', NOW)).toBe('một ngày trước');
    expect(formatRelativeTime('2026-10-19T09:00:00.000Z', NOW)).toBe('Một ngày trước');
    await applyLanguage('en');
  });
});
