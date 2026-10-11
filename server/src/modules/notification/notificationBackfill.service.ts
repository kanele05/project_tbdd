/**
 * Gắn `data.key` + `data.params` cho thông báo CŨ (lưu chữ đã dựng sẵn) để mobile dịch theo ngôn ngữ đang chọn.
 * Chỉ động vào dòng chưa có `data.key` và parse được (`notificationBackfillParser`); dòng không khớp giữ nguyên.
 * Idempotent: chạy lại sau khi apply thì không còn dòng nào để sửa. Dry-run (mặc định) không ghi gì.
 */
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import { parseStoredNotification } from './notificationBackfillParser';

export const BACKFILL_BATCH_SIZE = 200;
const SAMPLE_LIMIT = 5;
const BODY_PREVIEW_CHARS = 30;

export type UnmatchedSample = { id: string; type: string; title: string; bodyPreview: string };

export type NotificationBackfillResult = {
  applied: boolean;
  scanned: number;
  alreadyKeyed: number;
  matched: number;
  unmatched: number;
  updated: number;
  byKey: Record<string, number>;
  unmatchedByType: Record<string, number>;
  unmatchedSamples: UnmatchedSample[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bump(counts: Record<string, number>, name: string): void {
  counts[name] = (counts[name] ?? 0) + 1;
}

export async function backfillNotificationKeys(
  shouldApply: boolean,
  batchSize = BACKFILL_BATCH_SIZE,
): Promise<NotificationBackfillResult> {
  const result: NotificationBackfillResult = {
    applied: shouldApply,
    scanned: 0,
    alreadyKeyed: 0,
    matched: 0,
    unmatched: 0,
    updated: 0,
    byKey: {},
    unmatchedByType: {},
    unmatchedSamples: [],
  };

  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.notification.findMany({
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, type: true, title: true, body: true, data: true },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]?.id;

    const updates: { id: string; data: Prisma.InputJsonObject }[] = [];
    for (const row of rows) {
      result.scanned += 1;
      const existing = asRecord(row.data);
      if (typeof existing?.key === 'string') {
        result.alreadyKeyed += 1;
        continue;
      }
      const parsed = parseStoredNotification(row);
      if (!parsed) {
        result.unmatched += 1;
        bump(result.unmatchedByType, row.type);
        if (result.unmatchedSamples.length < SAMPLE_LIMIT) {
          result.unmatchedSamples.push({
            id: row.id,
            type: row.type,
            title: row.title,
            bodyPreview: row.body.slice(0, BODY_PREVIEW_CHARS),
          });
        }
        continue;
      }
      result.matched += 1;
      bump(result.byKey, parsed.key);
      updates.push({
        id: row.id,
        data: { ...(existing as Prisma.InputJsonObject | null), ...parsed },
      });
    }

    if (shouldApply && updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.notification.update({
            where: { id: update.id },
            data: { data: update.data },
            select: { id: true },
          }),
        ),
      );
      result.updated += updates.length;
    }
    if (rows.length < batchSize) break;
  }
  return result;
}
