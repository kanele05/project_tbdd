/**
 * Cập nhật 2 bài xem thử (YouTube) của mỗi khóa học mà KHÔNG cần reseed.
 * Mặc định chạy thử (dry-run); thêm `--apply` để ghi DB. Xem mục "Cập nhật video xem thử" trong server/README.md.
 */
import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';
import { updateCoursePreviews } from '@/modules/course/coursePreviewUpdate.service';
import { parsePreviewUpdateArgs } from '@/modules/course/coursePreviewUpdateArgs';
import { parseExternalPreviewManifest } from '@/modules/course/externalPreviewManifest';

import { COURSES } from '../prisma/seed-data/courses';

async function main() {
  const { manifestPath, shouldApply } = parsePreviewUpdateArgs(process.argv.slice(2));
  const previews = parseExternalPreviewManifest(
    JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8')) as unknown,
    COURSES.map((course) => course.slug),
  );
  const result = await updateCoursePreviews(previews, shouldApply);
  const changedLessons = result.changes.reduce((total, item) => total + item.changedLessons, 0);
  logger.info(
    { ...result, changedLessons },
    shouldApply ? 'Course previews updated without reseeding' : 'Preview dry run',
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : 'Preview update failed');
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
