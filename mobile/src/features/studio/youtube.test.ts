import { getYouTubeVideoId, normalizeYouTubeUrl } from './youtube';

describe('normalizeYouTubeUrl', () => {
  it('turns every valid form into the canonical watch link', () => {
    const canonical = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(canonical);
    expect(normalizeYouTubeUrl('http://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toBe(canonical);
    expect(normalizeYouTubeUrl('  https://youtube.com/watch?v=dQw4w9WgXcQ  ')).toBe(canonical);
  });

  it('keeps start / end and reads t= of a share link as start', () => {
    expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=30&end=90')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=30&end=90',
    );
    expect(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=42',
    );
  });

  it('rejects other hosts, bad ids, credentials and end <= start', () => {
    expect(normalizeYouTubeUrl('https://vimeo.com/123')).toBeNull();
    expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(normalizeYouTubeUrl('https://www.youtube.com/playlist?list=abc')).toBeNull();
    expect(normalizeYouTubeUrl('https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(
      normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=90&end=30'),
    ).toBeNull();
    expect(normalizeYouTubeUrl('not a url')).toBeNull();
    expect(normalizeYouTubeUrl('')).toBeNull();
  });
});

describe('getYouTubeVideoId', () => {
  it('returns the id or null', () => {
    expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('nope')).toBeNull();
  });
});
