import fs from 'node:fs';
import path from 'node:path';

import { buildCatalog } from '../../prisma/seed-data/catalog';
import {
  COURSE_PREVIEW_DURATIONS_SEC,
  getCoursePreview,
} from '../../prisma/seed-data/coursePreviews';
import { COURSES } from '../../prisma/seed-data/courses';
import { CURRICULUM } from '../../prisma/seed-data/curriculum';
import { getExternalCoursePreview } from '../../prisma/seed-data/externalCoursePreviews';
import { VIDEOS } from '../../prisma/seed-data/media';

type PreviewScene = { title: string; durationSec: number; lines: string[]; visual: string };

type PreviewCourse = {
  slug: string;
  title: string;
  category: string;
  hook: string;
  durationSec: number;
  topics: string[];
  scenes: PreviewScene[];
};

type PreviewManifest = {
  version: number;
  fps: number;
  width: number;
  height: number;
  defaultSceneDurationSec: number;
  courses: PreviewCourse[];
};

const manifestPath = path.resolve(__dirname, '../../scripts/course-previews/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PreviewManifest;

describe('course preview trailers', () => {
  it('covers every course with complete curriculum and specifically timed scenes', () => {
    expect(manifest.version).toBe(2);
    expect(manifest.fps).toBe(30);
    expect(manifest.width).toBe(1920);
    expect(manifest.height).toBe(1080);
    expect(manifest.defaultSceneDurationSec).toBeGreaterThan(0);
    expect(manifest.courses).toHaveLength(30);
    expect(manifest.courses.map(({ slug }) => slug).sort()).toEqual(
      COURSES.map(({ slug }) => slug).sort(),
    );
    expect(Object.keys(COURSE_PREVIEW_DURATIONS_SEC).sort()).toEqual(
      COURSES.map(({ slug }) => slug).sort(),
    );

    for (const entry of manifest.courses) {
      const course = COURSES.find(({ slug }) => slug === entry.slug);
      const curriculum = CURRICULUM[entry.slug];
      expect(course?.title).toBe(entry.title);
      expect(course?.category).toBe(entry.category);
      expect(curriculum).toBeDefined();
      expect(entry.topics).toEqual(curriculum?.flatMap(({ lessons }) => lessons));
      expect(entry.hook.length).toBeGreaterThan(12);
      expect(entry.scenes).toHaveLength(12);
      expect(entry.scenes[0]?.title).toBe('Hook');
      expect(entry.scenes.at(-1)?.title).toBe('Explore the course');
      expect(entry.durationSec).toBe(
        entry.scenes.reduce((total, scene) => total + scene.durationSec, 0),
      );
      expect(entry.durationSec).toBeGreaterThanOrEqual(55);
      expect(entry.durationSec).toBeLessThanOrEqual(95);
      expect(new Set(entry.scenes.map(({ visual }) => visual)).size).toBeGreaterThanOrEqual(4);
      expect(
        entry.scenes.every(
          ({ durationSec, lines, visual }) =>
            durationSec > 0 && lines.length > 0 && visual.length > 0,
        ),
      ).toBe(true);
      expect(
        entry.scenes.slice(1, -1).filter(({ title }) => entry.topics.includes(title)).length,
      ).toBeGreaterThanOrEqual(8);
      expect(COURSE_PREVIEW_DURATIONS_SEC[entry.slug]).toBe(entry.durationSec);
      expect(getCoursePreview(entry.slug)).toEqual({
        url: expect.stringContaining(`/static/previews/${entry.slug}-v2.mp4`),
        durationSec: entry.durationSec,
      });
    }
  });

  it('shows language-specific code examples for each programming course', () => {
    const courseText = (slug: string) =>
      manifest.courses
        .find((course) => course.slug === slug)
        ?.scenes.flatMap(({ lines }) => lines)
        .join('\n');

    expect(courseText('python-introduction')).toContain('print(f');
    expect(courseText('python-introduction')).toContain('for path in folder.iterdir()');
    expect(courseText('python-introduction')).toContain('def category_for(path)');
    expect(courseText('python-introduction')).toContain('shutil.move');
    expect(courseText('javascript-for-beginners')).toContain('document.querySelector');
    expect(courseText('javascript-for-beginners')).toContain('addEventListener');
    expect(courseText('javascript-for-beginners')).toContain('await fetch');
    expect(courseText('javascript-for-beginners')).toContain('localStorage.setItem');
    expect(courseText('sql-essentials')).toContain('SELECT name, course_id FROM enrollments;');
    expect(courseText('sql-essentials')).toContain('JOIN enrollments');
    expect(courseText('sql-essentials')).toContain('GROUP BY course_id');
    expect(courseText('sql-essentials')).toContain('INSERT INTO enrollments');
    expect(courseText('php-in-one-click')).toContain('<?php echo');
    expect(courseText('php-in-one-click')).toContain('$_POST');
    expect(courseText('php-in-one-click')).toContain('new PDO');
    expect(courseText('java-fundamentals')).toContain('public class Main');
    expect(courseText('java-fundamentals')).toContain('public static void main');
  });

  it('uses each external reference only for the first two preview lessons', () => {
    const catalog = buildCatalog(Date.UTC(2026, 9, 8));

    for (const course of catalog.courses) {
      const preview = getExternalCoursePreview(course.seed.slug);
      expect(preview.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(
        course.lessons.slice(0, 2).map(({ videoUrl, durationSec, isPreview }) => ({
          videoUrl,
          durationSec,
          isPreview,
        })),
      ).toEqual([
        { videoUrl: preview.url, durationSec: preview.durationSec, isPreview: true },
        { videoUrl: preview.url, durationSec: preview.durationSec, isPreview: true },
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
    expect(() => getCoursePreview('unlisted-course')).toThrow('Unknown course preview slug');
    expect(() => getExternalCoursePreview('unlisted-course')).toThrow(
      'Unknown external course preview slug',
    );
  });
});
