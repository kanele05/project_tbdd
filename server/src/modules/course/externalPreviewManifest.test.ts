import { parseExternalPreviewManifest } from './externalPreviewManifest';

const KNOWN_SLUGS = ['python-introduction'];

const ENTRY = {
  slug: 'python-introduction',
  videoId: 'AbCdEf12345',
  title: 'Python introduction',
  creator: 'Example creator',
  startSeconds: 10,
  endSeconds: 130,
  playbackVerified: true,
  verifiedAt: '2026-10-08T11:00:00Z',
};

describe('parseExternalPreviewManifest', () => {
  it('targets only the two expected preview lessons with a canonical HTTPS excerpt', () => {
    expect(parseExternalPreviewManifest([ENTRY], KNOWN_SLUGS)).toEqual([
      {
        courseId: 'crs_python_introduction',
        lessonIds: ['les_python_introduction_01', 'les_python_introduction_02'],
        videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=130',
        durationSec: 120,
      },
    ]);
  });

  it.each([
    { slug: 'unknown-course' },
    { slug: '../../secret' },
    { videoId: 'bad-id' },
    { videoId: 'AbCdEf12345&autoplay=1' },
    { startSeconds: -1 },
    { startSeconds: 10.5 },
    { endSeconds: 10 },
    { endSeconds: 9 },
    { endSeconds: 86_401 },
    { title: ' ' },
    { creator: '' },
    { playbackVerified: false },
    { playbackVerified: undefined },
    { verifiedAt: 'unverified' },
    { videoUrl: 'https://malicious.example/video' },
    { lessonIds: ['some-other-lesson'] },
  ])('rejects an invalid or unverified entry %j', (overrides) => {
    expect(() => parseExternalPreviewManifest([{ ...ENTRY, ...overrides }], KNOWN_SLUGS)).toThrow();
  });

  it('rejects duplicates, empty and non-array manifests', () => {
    expect(() => parseExternalPreviewManifest([ENTRY, ENTRY], KNOWN_SLUGS)).toThrow();
    expect(() => parseExternalPreviewManifest([], KNOWN_SLUGS)).toThrow();
    expect(() => parseExternalPreviewManifest({ entries: [ENTRY] }, KNOWN_SLUGS)).toThrow();
  });
});
