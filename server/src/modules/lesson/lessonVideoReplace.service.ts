/**
 * Thay video của mọi bài học đang trỏ tới một URL chết (vd clip seed `download.blender.org` trả 403 từ 10/2026).
 * Cập nhật `videoUrl` + `durationSec` của bài, tính lại `totalDurationSec` của khóa, và kéo `positionSec` của
 * tiến độ học về tối đa thời lượng mới (để "tiếp tục học" không nhảy quá cuối video). Không đụng bài khác.
 * Chạy bằng `scripts/replaceLessonVideo.ts` (dry-run mặc định, `--apply` mới ghi DB).
 */
import { prisma } from '@/lib/prisma';
import { recomputeCourseCounts } from '@/modules/studio/studioShared';

export type LessonVideoReplacement = { fromUrl: string; toUrl: string; durationSec: number };

export type LessonVideoReplaceResult = {
  lessonCount: number;
  courseCount: number;
  progressClamped: number;
  applied: boolean;
};

export async function replaceLessonVideo(
  { fromUrl, toUrl, durationSec }: LessonVideoReplacement,
  shouldApply: boolean,
): Promise<LessonVideoReplaceResult> {
  const lessons = await prisma.lesson.findMany({
    where: { videoUrl: fromUrl },
    select: { id: true, section: { select: { courseId: true } } },
  });
  const lessonIds = lessons.map((lesson) => lesson.id);
  const courseIds = [...new Set(lessons.map((lesson) => lesson.section.courseId))];
  const tooFar = { lessonId: { in: lessonIds }, positionSec: { gt: durationSec } };
  const progressClamped = await prisma.lessonProgress.count({ where: tooFar });
  const result = {
    lessonCount: lessons.length,
    courseCount: courseIds.length,
    progressClamped,
    applied: false,
  };
  if (!shouldApply || lessons.length === 0) return result;

  await prisma.$transaction(async (tx) => {
    await tx.lesson.updateMany({
      where: { id: { in: lessonIds } },
      data: { videoUrl: toUrl, durationSec },
    });
    await tx.lessonProgress.updateMany({ where: tooFar, data: { positionSec: durationSec } });
    for (const courseId of courseIds) await recomputeCourseCounts(tx, courseId);
  });
  return { ...result, applied: true };
}
