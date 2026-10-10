import { courseId } from '@/modules/course/courseIds';
import { parseExternalPreviewManifest } from '@/modules/course/externalPreviewManifest';

import { COURSES } from './courses';
import manifest from './externalCoursePreviewManifest.json';

type ExternalLessonPreview = { url: string; durationSec: number };

const previews = new Map(
  parseExternalPreviewManifest(
    manifest,
    COURSES.map((course) => course.slug),
  ).map((preview) => [preview.courseId, preview]),
);

/** Đoạn xem thử riêng của bài 01 và bài 02 trong khóa (cùng một video YouTube, hai khoảng khác nhau). */
export function getExternalCoursePreviews(
  slug: string,
): readonly [ExternalLessonPreview, ExternalLessonPreview] {
  const preview = previews.get(courseId(slug));
  if (!preview) throw new Error(`Unknown external course preview slug: ${slug}`);
  const [first, second] = preview.lessons;
  return [
    { url: first.videoUrl, durationSec: first.durationSec },
    { url: second.videoUrl, durationSec: second.durationSec },
  ];
}
