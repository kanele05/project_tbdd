import { getClipRelativeTime, isYouTubeHostUrl, parseYouTubeVideoSource } from './youtube';

describe('parseYouTubeVideoSource', () => {
  it('parses supported canonical YouTube watch and short links', () => {
    expect(
      parseYouTubeVideoSource('https://www.youtube.com/watch?v=AbCdEf12345&start=12&end=42'),
    ).toEqual({
      videoId: 'AbCdEf12345',
      startSeconds: 12,
      endSeconds: 42,
    });
    expect(parseYouTubeVideoSource('https://youtu.be/AbCdEf12345')).toEqual({
      videoId: 'AbCdEf12345',
      startSeconds: 0,
    });
  });

  it.each([
    'http://www.youtube.com/watch?v=AbCdEf12345',
    'https://youtube.com.evil.test/watch?v=AbCdEf12345',
    'https://www.youtube.com.evil.test/watch?v=AbCdEf12345',
    'https://www.youtube.com/watch?v=invalid',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=-1',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=NaN',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=2.5',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=86401',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=20&end=19',
    'https://www.youtube.com/watch?v=AbCdEf12345&start=1&start=2',
    'https://www.youtube.com/embed/AbCdEf12345',
    'https://user:pass@www.youtube.com/watch?v=AbCdEf12345',
  ])('rejects unsafe or unsupported source %s', (source) => {
    expect(parseYouTubeVideoSource(source)).toBeNull();
  });

  it('recognizes a YouTube host even when its source is invalid', () => {
    expect(isYouTubeHostUrl('https://youtube.com/watch?v=bad')).toBe(true);
    expect(isYouTubeHostUrl('https://youtube.com.evil.test/watch?v=bad')).toBe(false);
  });

  it('clamps progress to the parsed clip relative to its start', () => {
    const source = parseYouTubeVideoSource('https://youtu.be/AbCdEf12345?start=10&end=30');
    expect(source).not.toBeNull();
    expect(getClipRelativeTime(8, source!)).toBe(0);
    expect(getClipRelativeTime(24, source!)).toBe(14);
    expect(getClipRelativeTime(40, source!)).toBe(20);
  });
});
