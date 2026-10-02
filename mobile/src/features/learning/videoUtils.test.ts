import { getResumePosition, getShortCourseTitle, resolveVideoUrl } from './videoUtils';

describe('getResumePosition', () => {
  it('resumes from the saved position', () => {
    expect(getResumePosition({ positionSec: 42, durationSec: 100, isCompleted: false })).toBe(42);
  });

  it('starts at 0 for a lesson never watched', () => {
    expect(getResumePosition({ positionSec: 0, durationSec: 100, isCompleted: false })).toBe(0);
  });

  it('restarts a completed lesson that was left near the end', () => {
    expect(getResumePosition({ positionSec: 95, durationSec: 100, isCompleted: true })).toBe(0);
  });

  it('keeps the position of a completed lesson that was left in the middle', () => {
    expect(getResumePosition({ positionSec: 30, durationSec: 100, isCompleted: true })).toBe(30);
  });

  it('restarts when the saved position is the very end', () => {
    expect(getResumePosition({ positionSec: 100, durationSec: 100, isCompleted: false })).toBe(0);
  });

  it('keeps a position of an unfinished lesson past 90 % (not completed yet)', () => {
    expect(getResumePosition({ positionSec: 95, durationSec: 100, isCompleted: false })).toBe(95);
  });

  it('ignores invalid positions', () => {
    expect(
      getResumePosition({ positionSec: Number.NaN, durationSec: 100, isCompleted: false }),
    ).toBe(0);
  });
});

describe('resolveVideoUrl', () => {
  it('keeps absolute URLs', () => {
    expect(resolveVideoUrl('https://cdn.example.com/a.mp4')).toBe('https://cdn.example.com/a.mp4');
  });

  it('prefixes server-relative paths with the API origin', () => {
    expect(resolveVideoUrl('/static/a.mp4', 'http://192.168.1.10:4000/api/v1')).toBe(
      'http://192.168.1.10:4000/static/a.mp4',
    );
    expect(resolveVideoUrl('static/a.mp4', 'http://192.168.1.10:4000/api/v1/')).toBe(
      'http://192.168.1.10:4000/static/a.mp4',
    );
  });
});

describe('getShortCourseTitle', () => {
  it('keeps the part before the colon', () => {
    expect(getShortCourseTitle('UX Foundation: Introduction to User Experience Design')).toBe(
      'UX Foundation',
    );
  });

  it('keeps a title without colon', () => {
    expect(getShortCourseTitle('PHP in One Click')).toBe('PHP in One Click');
  });
});
