import { parseExternalPreviewManifest } from './externalPreviewManifest';

const KNOWN_SLUGS = ['python-introduction'];

const ENTRY = {
  slug: 'python-introduction',
  videoId: 'AbCdEf12345',
  title: 'Python introduction',
  creator: 'Example creator',
  excerpts: [
    { startSeconds: 10, endSeconds: 130 },
    { startSeconds: 190, endSeconds: 310 },
  ],
  playbackVerified: true,
  verifiedAt: '2026-10-08T11:00:00Z',
};

type Range = readonly [number, number];

function withExcerpts(first: Range, second: Range) {
  return {
    ...ENTRY,
    excerpts: [first, second].map(([startSeconds, endSeconds]) => ({ startSeconds, endSeconds })),
  };
}

describe('parseExternalPreviewManifest', () => {
  it('gives each preview lesson its own canonical HTTPS excerpt', () => {
    expect(parseExternalPreviewManifest([ENTRY], KNOWN_SLUGS)).toEqual([
      {
        courseId: 'crs_python_introduction',
        lessons: [
          {
            lessonId: 'les_python_introduction_01',
            videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=130',
            durationSec: 120,
          },
          {
            lessonId: 'les_python_introduction_02',
            videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=190&end=310',
            durationSec: 120,
          },
        ],
      },
    ]);
  });

  it('accepts adjacent excerpts at the 45 and 180 second limits', () => {
    expect(() =>
      parseExternalPreviewManifest([withExcerpts([0, 45], [45, 90])], KNOWN_SLUGS),
    ).not.toThrow();
    expect(() =>
      parseExternalPreviewManifest([withExcerpts([0, 180], [180, 360])], KNOWN_SLUGS),
    ).not.toThrow();
  });

  it.each([
    { slug: 'unknown-course' },
    { slug: '../../secret' },
    { videoId: 'bad-id' },
    { videoId: 'AbCdEf12345&autoplay=1' },
    { title: ' ' },
    { creator: '' },
    { playbackVerified: false },
    { playbackVerified: undefined },
    { verifiedAt: 'unverified' },
    { videoUrl: 'https://malicious.example/video' },
    { lessonIds: ['some-other-lesson'] },
    { startSeconds: 10, endSeconds: 130 },
    { excerpts: undefined },
    { excerpts: [ENTRY.excerpts[0]] },
    { excerpts: [...ENTRY.excerpts, ENTRY.excerpts[0]] },
    { excerpts: [{ startSeconds: 10, endSeconds: 130, extra: 1 }, ENTRY.excerpts[1]] },
    withExcerpts([-1, 100], [200, 320]),
    withExcerpts([10.5, 130], [200, 320]),
    withExcerpts([10, 130], [200, 86_401]),
    withExcerpts([10, 54], [200, 320]),
    withExcerpts([10, 191], [300, 420]),
    withExcerpts([10, 130], [100, 220]),
    withExcerpts([10, 130], [10, 130]),
    withExcerpts([190, 310], [10, 130]),
  ])('rejects an invalid or unverified entry %j', (overrides) => {
    expect(() => parseExternalPreviewManifest([{ ...ENTRY, ...overrides }], KNOWN_SLUGS)).toThrow();
  });

  it('rejects duplicates, empty and non-array manifests', () => {
    expect(() => parseExternalPreviewManifest([ENTRY, ENTRY], KNOWN_SLUGS)).toThrow();
    expect(() => parseExternalPreviewManifest([], KNOWN_SLUGS)).toThrow();
    expect(() => parseExternalPreviewManifest({ entries: [ENTRY] }, KNOWN_SLUGS)).toThrow();
  });
});
