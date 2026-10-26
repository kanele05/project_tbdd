import { prisma } from '@/lib/prisma';
import { replaceLessonVideo } from '@/modules/lesson/lessonVideoReplace.service';

import {
  createCourseWithLessons,
  createLessonProgress,
  createUser,
  uniq,
} from '../helpers/factories';

// Tests share one database: each test gets its own dead URL so they never see each other's lessons.
const deadUrl = () =>
  `https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4?${uniq()}`;
const ALIVE =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';

/** One course of 3 lessons x 52 s; the first two still use the dead clip, a learner is 40 s into lesson 1. */
async function fixture() {
  const dead = deadUrl();
  const { course, lessons } = await createCourseWithLessons({
    sections: 1,
    lessonsPerSection: 3,
    lessonDurationSec: 52,
  });
  await prisma.lesson.updateMany({
    where: { id: { in: [lessons[0]!.id, lessons[1]!.id] } },
    data: { videoUrl: dead },
  });
  const user = await createUser();
  await createLessonProgress(user.id, lessons[0]!.id, { positionSec: 40 });
  await createLessonProgress(user.id, lessons[1]!.id, { positionSec: 6 });
  return { course, lessons, user, replacement: { fromUrl: dead, toUrl: ALIVE, durationSec: 10 } };
}

describe('replaceLessonVideo', () => {
  it('only counts in a dry run', async () => {
    const { lessons, replacement } = await fixture();

    const result = await replaceLessonVideo(replacement, false);

    expect(result).toEqual({ lessonCount: 2, courseCount: 1, progressClamped: 1, applied: false });
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[0]!.id } });
    expect(lesson.videoUrl).toBe(replacement.fromUrl);
  });

  it('swaps the clip, its length, the course total and clamps progress past the new end', async () => {
    const { course, lessons, user, replacement } = await fixture();

    const result = await replaceLessonVideo(replacement, true);

    expect(result).toMatchObject({ lessonCount: 2, applied: true });
    const updated = await prisma.lesson.findMany({
      where: { id: { in: lessons.map((lesson) => lesson.id) } },
      orderBy: { order: 'asc' },
    });
    expect(updated.map((lesson) => [lesson.videoUrl === ALIVE, lesson.durationSec])).toEqual([
      [true, 10],
      [true, 10],
      [false, 52],
    ]);
    const after = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(after.totalDurationSec).toBe(10 + 10 + 52);
    const progress = await prisma.lessonProgress.findMany({
      where: { userId: user.id },
      orderBy: { positionSec: 'desc' },
    });
    expect(progress.map((row) => row.positionSec)).toEqual([10, 6]);
  });

  it('does nothing when no lesson uses the dead clip', async () => {
    await createCourseWithLessons({ sections: 1, lessonsPerSection: 1 });
    const replacement = { fromUrl: deadUrl(), toUrl: ALIVE, durationSec: 10 };
    await expect(replaceLessonVideo(replacement, true)).resolves.toEqual({
      lessonCount: 0,
      courseCount: 0,
      progressClamped: 0,
      applied: false,
    });
  });
});
