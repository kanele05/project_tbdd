import { formatDuration, formatLessonDuration, formatTotalHours } from './formatDuration';

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(2 * 3600 + 25 * 60)).toBe('2 hrs 25 mins');
    expect(formatDuration(3600 + 60)).toBe('1 hr 1 min');
  });

  it('omits zero parts', () => {
    expect(formatDuration(3600)).toBe('1 hr');
    expect(formatDuration(3 * 3600)).toBe('3 hrs');
    expect(formatDuration(25 * 60)).toBe('25 mins');
  });

  it('handles zero and invalid input', () => {
    expect(formatDuration(0)).toBe('0 mins');
    expect(formatDuration(Number.NaN)).toBe('0 mins');
  });
});

describe('formatLessonDuration', () => {
  it('formats mm:ss with a mins suffix', () => {
    expect(formatLessonDuration(83)).toBe('01:23 mins');
    expect(formatLessonDuration(0)).toBe('00:00 mins');
    expect(formatLessonDuration(605)).toBe('10:05 mins');
  });

  it('lets minutes exceed 59', () => {
    expect(formatLessonDuration(3725)).toBe('62:05 mins');
  });
});

describe('formatTotalHours', () => {
  it('rounds to whole hours', () => {
    expect(formatTotalHours(14 * 3600)).toBe('14 hours');
    expect(formatTotalHours(3600)).toBe('1 hour');
  });

  it('falls back to minutes for short courses', () => {
    expect(formatTotalHours(20 * 60)).toBe('20 mins');
  });
});
