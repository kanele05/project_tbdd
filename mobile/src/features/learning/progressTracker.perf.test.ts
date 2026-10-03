import { PROGRESS_SAVE_INTERVAL_MS } from '@/constants/config';
import type { LessonProgressResponse } from '@/types/api';

import { LessonProgressTracker } from './progressTracker';

/**
 * M-29 (mobile): how many `PUT /lessons/:id/progress` calls does watching a video cost?
 * Compares the 10 s throttle (PLAN FR-16) with a naive "save on every player tick" (1 s).
 * Fake timers drive the clock the tracker reads, so the numbers are deterministic.
 */

const RESPONSE: LessonProgressResponse = {
  lessonProgress: { positionSec: 0, isCompleted: false },
  courseProgressPercent: 0,
};

/** Watch `watchedSeconds` of a long lesson, one player `timeUpdate` per second. */
async function countSaves(watchedSeconds: number, intervalMs: number): Promise<number> {
  const send = jest.fn().mockResolvedValue(RESPONSE);
  const tracker = new LessonProgressTracker({
    lessonId: 'lesson-1',
    courseId: 'course-1',
    userId: 'user-1',
    // Long enough that the 90 % completion save never fires during the measurement.
    durationSec: 100_000,
    intervalMs,
    send,
    enqueue: jest.fn().mockResolvedValue(undefined),
    dequeue: jest.fn().mockResolvedValue(undefined),
    isOnline: () => true,
  });

  for (let second = 1; second <= watchedSeconds; second += 1) {
    await jest.advanceTimersByTimeAsync(1000);
    tracker.update(second);
  }
  await jest.advanceTimersByTimeAsync(0);
  return send.mock.calls.length;
}

describe('M-29 progress save requests', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('throttles to one save per 10 s by default', () => {
    expect(PROGRESS_SAVE_INTERVAL_MS).toBe(10_000);
  });

  it('costs 30 requests for 5 minutes instead of 300 when saving every second', async () => {
    const throttled = await countSaves(300, PROGRESS_SAVE_INTERVAL_MS);
    const everySecond = await countSaves(300, 1000);

    expect(throttled).toBe(30);
    expect(everySecond).toBe(300);
    expect(throttled / everySecond).toBeCloseTo(0.1, 5);
  });

  it('scales with watch time: 1, 5 and 30 minutes', async () => {
    const rows: string[] = [];
    for (const minutes of [1, 5, 30]) {
      const throttled = await countSaves(minutes * 60, PROGRESS_SAVE_INTERVAL_MS);
      const everySecond = await countSaves(minutes * 60, 1000);
      rows.push(
        `| ${minutes} min | ${everySecond} | ${throttled} | ${Math.round((1 - throttled / everySecond) * 100)} % |`,
      );
      expect(throttled).toBe(minutes * 6);
      expect(everySecond).toBe(minutes * 60);
    }
    console.log(
      [
        '',
        '| Watch time | Save every 1 s | Throttle 10 s | Reduction |',
        '|---|---|---|---|',
        ...rows,
      ].join('\n'),
    );
  });
});
