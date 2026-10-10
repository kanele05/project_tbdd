import { buildCatalog } from '../../prisma/seed-data/catalog';
import { COURSES } from '../../prisma/seed-data/courses';
import { getExternalCoursePreviews } from '../../prisma/seed-data/externalCoursePreviews';
import { VIDEOS } from '../../prisma/seed-data/media';

function youtubeRange(url: string) {
  const params = new URL(url).searchParams;
  return {
    videoId: params.get('v'),
    start: Number(params.get('start')),
    end: Number(params.get('end')),
  };
}

describe('external course previews', () => {
  it('gives every course two different, non-overlapping excerpts of one YouTube video', () => {
    for (const course of COURSES) {
      const [first, second] = getExternalCoursePreviews(course.slug);
      expect(first.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(second.url).not.toBe(first.url);
      const a = youtubeRange(first.url);
      const b = youtubeRange(second.url);
      expect(b.videoId).toBe(a.videoId);
      expect(b.start).toBeGreaterThanOrEqual(a.end);
      expect(first.durationSec).toBe(a.end - a.start);
      expect(second.durationSec).toBe(b.end - b.start);
    }
  });

  it('uses the first excerpt for lesson 01, the second for lesson 02 and plain videos afterwards', () => {
    const catalog = buildCatalog(Date.UTC(2026, 9, 8));

    for (const course of catalog.courses) {
      const [first, second] = getExternalCoursePreviews(course.seed.slug);
      expect(
        course.lessons.slice(0, 2).map(({ videoUrl, durationSec, isPreview }) => ({
          videoUrl,
          durationSec,
          isPreview,
        })),
      ).toEqual([
        { videoUrl: first.url, durationSec: first.durationSec, isPreview: true },
        { videoUrl: second.url, durationSec: second.durationSec, isPreview: true },
      ]);

      for (const lesson of course.lessons.slice(2)) {
        const video = VIDEOS[(COURSES.indexOf(course.seed) + lesson.number) % VIDEOS.length];
        expect(lesson.isPreview).toBe(false);
        expect(lesson.videoUrl).toBe(video?.url);
        expect(lesson.durationSec).toBe(video?.durationSec);
      }
    }
  });

  it('rejects unknown slugs', () => {
    expect(() => getExternalCoursePreviews('unlisted-course')).toThrow(
      'Unknown external course preview slug',
    );
  });
});
