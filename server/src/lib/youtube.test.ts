import { normalizeYouTubeUrl } from './youtube';

const ID = 'dQw4w9WgXcQ';
const CANONICAL = `https://www.youtube.com/watch?v=${ID}`;

describe('normalizeYouTubeUrl', () => {
  it('keeps a canonical watch URL', () => {
    expect(normalizeYouTubeUrl(CANONICAL)).toBe(CANONICAL);
  });

  it('normalizes youtu.be, mobile and extra params into watch?v=', () => {
    expect(normalizeYouTubeUrl(`https://youtu.be/${ID}`)).toBe(CANONICAL);
    expect(normalizeYouTubeUrl(`https://m.youtube.com/watch?v=${ID}&feature=share`)).toBe(
      CANONICAL,
    );
    expect(normalizeYouTubeUrl(`  http://youtube.com/watch?v=${ID}  `)).toBe(CANONICAL);
  });

  it('keeps start/end and maps t= of short links to start', () => {
    expect(normalizeYouTubeUrl(`${CANONICAL}&start=30&end=90`)).toBe(
      `${CANONICAL}&start=30&end=90`,
    );
    expect(normalizeYouTubeUrl(`https://youtu.be/${ID}?t=45`)).toBe(`${CANONICAL}&start=45`);
    expect(normalizeYouTubeUrl(`${CANONICAL}&start=0`)).toBe(CANONICAL);
  });

  it('rejects other hosts, bad ids and invalid ranges', () => {
    expect(normalizeYouTubeUrl('https://vimeo.com/123456')).toBeNull();
    expect(normalizeYouTubeUrl('https://evil.com/watch?v=' + ID)).toBeNull();
    expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(normalizeYouTubeUrl('https://www.youtube.com/embed/' + ID)).toBeNull();
    expect(normalizeYouTubeUrl(`${CANONICAL}&start=90&end=30`)).toBeNull();
    expect(normalizeYouTubeUrl(`${CANONICAL}&start=abc`)).toBeNull();
    expect(normalizeYouTubeUrl('not a url')).toBeNull();
    expect(normalizeYouTubeUrl('javascript:alert(1)')).toBeNull();
  });
});
