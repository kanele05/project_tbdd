import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';
import {
  type CoursePreviewUpdate,
  updateCoursePreviews,
} from '@/modules/course/coursePreviewUpdate.service';
import { parseExternalPreviewManifest } from '@/modules/course/externalPreviewManifest';

import { getCoursePreview } from '../prisma/seed-data/coursePreviews';
import { courseId, COURSES } from '../prisma/seed-data/courses';

function getRenderedPreviews(): CoursePreviewUpdate[] {
  return COURSES.map((course): CoursePreviewUpdate => {
    const id = courseId(course.slug);
    const asset = path.resolve(__dirname, '..', 'static', 'previews', `${course.slug}-v2.mp4`);
    if (!fs.existsSync(asset) || fs.statSync(asset).size === 0) {
      throw new Error(`Missing rendered preview: ${course.slug}`);
    }
    const preview = getCoursePreview(course.slug);
    return {
      courseId: id,
      lessonIds: [`les_${id.slice(4)}_01`, `les_${id.slice(4)}_02`],
      videoUrl: preview.url,
      durationSec: preview.durationSec,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const manifestIndex = args.indexOf('--external-manifest');
  const manifestPath = manifestIndex === -1 ? undefined : args[manifestIndex + 1];
  if (manifestIndex !== -1 && (!manifestPath || manifestPath.startsWith('--'))) {
    throw new Error('Provide a JSON file after --external-manifest');
  }
  const expectedArgs = new Set([
    '--apply',
    '--external-manifest',
    ...(manifestPath ? [manifestPath] : []),
  ]);
  if (args.some((arg) => !expectedArgs.has(arg)) || new Set(args).size !== args.length) {
    throw new Error('Usage: updateCoursePreviews [--apply] [--external-manifest file.json]');
  }
  const shouldApply = args.includes('--apply');
  const previews = manifestPath
    ? parseExternalPreviewManifest(
        JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8')) as unknown,
        COURSES.map((course) => course.slug),
      )
    : getRenderedPreviews();
  const result = await updateCoursePreviews(previews, shouldApply);
  logger.info(
    result,
    shouldApply ? 'Course previews updated without reseeding' : 'Preview dry run',
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : 'Preview update failed');
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
