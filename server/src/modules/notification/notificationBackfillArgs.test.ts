import {
  NOTIFICATION_BACKFILL_USAGE,
  parseNotificationBackfillArgs,
} from './notificationBackfillArgs';

describe('parseNotificationBackfillArgs', () => {
  it('defaults to a dry run', () => {
    expect(parseNotificationBackfillArgs([])).toEqual({ shouldApply: false });
  });

  it('writes only with --apply', () => {
    expect(parseNotificationBackfillArgs(['--apply'])).toEqual({ shouldApply: true });
  });

  it('rejects unknown or repeated arguments', () => {
    expect(() => parseNotificationBackfillArgs(['--force'])).toThrow(NOTIFICATION_BACKFILL_USAGE);
    expect(() => parseNotificationBackfillArgs(['--apply', '--apply'])).toThrow(
      NOTIFICATION_BACKFILL_USAGE,
    );
  });
});
