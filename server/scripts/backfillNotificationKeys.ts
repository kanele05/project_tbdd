/**
 * Gắn `data.key` + `data.params` cho thông báo cũ (đã lưu chữ dựng sẵn) để mobile dịch theo ngôn ngữ đang chọn.
 * Mặc định chạy thử (dry-run); thêm `--apply` để ghi DB. Xem mục "Backfill khóa thông báo" trong server/README.md.
 *   npm run notifications:backfill:dry-run
 *   npm run notifications:backfill:apply
 */
import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';
import { backfillNotificationKeys } from '@/modules/notification/notificationBackfill.service';
import { parseNotificationBackfillArgs } from '@/modules/notification/notificationBackfillArgs';

async function main() {
  const { shouldApply } = parseNotificationBackfillArgs(process.argv.slice(2));
  const result = await backfillNotificationKeys(shouldApply);
  logger.info(
    result,
    shouldApply
      ? 'Notification keys backfilled'
      : 'Notification backfill dry run - add --apply to write',
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : 'Notification backfill failed');
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
