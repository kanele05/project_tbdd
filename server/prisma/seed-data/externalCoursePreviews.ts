import { parseExternalPreviewManifest } from '@/modules/course/externalPreviewManifest';

import { courseId, COURSES } from './courses';
import manifest from './externalCoursePreviewManifest.json';

const previews = new Map(
  parseExternalPreviewManifest(
    manifest,
    COURSES.map((course) => course.slug),
  ).map((preview) => [preview.courseId, preview]),
);

export function getExternalCoursePreview(slug: string): { url: string; durationSec: number } {
  const preview = previews.get(courseId(slug));
  if (!preview) throw new Error(`Unknown external course preview slug: ${slug}`);
  return { url: preview.videoUrl, durationSec: preview.durationSec };
}
