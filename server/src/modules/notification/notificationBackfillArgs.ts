export type NotificationBackfillArgs = { shouldApply: boolean };

export const NOTIFICATION_BACKFILL_USAGE = 'Usage: backfillNotificationKeys [--apply]';

/** Phân tích đối số CLI: không có đối số bắt buộc; mặc định dry-run, chỉ ghi DB khi có `--apply`. */
export function parseNotificationBackfillArgs(args: readonly string[]): NotificationBackfillArgs {
  let shouldApply = false;
  for (const arg of args) {
    if (arg !== '--apply' || shouldApply) throw new Error(NOTIFICATION_BACKFILL_USAGE);
    shouldApply = true;
  }
  return { shouldApply };
}
