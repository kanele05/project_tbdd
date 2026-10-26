/**
 * Thay clip seed đã chết `download.blender.org/.../sintel_trailer-480p.mp4` (HTTP 403 từ 10/2026) bằng
 * clip Big Buck Bunny 720p 10 s của test-videos.co.uk (CC-BY) cho mọi bài học còn trỏ tới nó.
 * Mặc định chạy thử (dry-run); thêm `--apply` để ghi DB. Backup DB trước khi chạy ở production
 * (server/README.md §5.4).
 *   npm run lessons:replace-dead-video            # dry-run
 *   npm run lessons:replace-dead-video -- --apply
 */
import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';
import { replaceLessonVideo } from '@/modules/lesson/lessonVideoReplace.service';

const DEAD_VIDEO_REPLACEMENT = {
  fromUrl: 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
  toUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  durationSec: 10,
};

async function main() {
  const shouldApply = process.argv.slice(2).includes('--apply');
  const result = await replaceLessonVideo(DEAD_VIDEO_REPLACEMENT, shouldApply);
  logger.info(
    result,
    result.applied ? 'Lesson videos replaced' : 'Lesson video dry run - add --apply to write',
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : 'Replace lesson video failed');
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
