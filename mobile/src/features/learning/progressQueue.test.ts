import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppError } from '@/lib/appError';
import type { LessonProgressResponse } from '@/types/api';

import {
  PENDING_PROGRESS_KEY,
  clearPendingProgress,
  enqueuePendingProgress,
  flushPendingProgress,
  getPendingProgress,
  removePendingProgress,
} from './progressQueue';

const OK: LessonProgressResponse = {
  lessonProgress: { positionSec: 0, isCompleted: false },
  courseProgressPercent: 10,
};

function entry(lessonId: string, positionSec: number, overrides = {}) {
  return {
    lessonId,
    courseId: 'course-1',
    userId: 'user-1',
    positionSec,
    isCompleted: false,
    ...overrides,
  };
}

describe('progress queue', () => {
  beforeEach(async () => {
    await clearPendingProgress();
  });

  describe('enqueuePendingProgress', () => {
    it('keeps only the newest position of a lesson', async () => {
      await enqueuePendingProgress(entry('lesson-1', 30));
      await enqueuePendingProgress(entry('lesson-1', 75));

      const queued = await getPendingProgress();
      expect(queued).toHaveLength(1);
      expect(queued[0]).toMatchObject({ lessonId: 'lesson-1', positionSec: 75 });
    });

    it('keeps one entry per lesson, oldest first', async () => {
      await enqueuePendingProgress(entry('lesson-1', 30), () => 1000);
      await enqueuePendingProgress(entry('lesson-2', 10), () => 2000);

      const queued = await getPendingProgress();
      expect(queued.map((item) => item.lessonId)).toEqual(['lesson-1', 'lesson-2']);
    });

    it('does not lose a completion when a later save is not completed', async () => {
      await enqueuePendingProgress(entry('lesson-1', 95, { isCompleted: true }));
      await enqueuePendingProgress(entry('lesson-1', 20));

      const [queued] = await getPendingProgress();
      expect(queued).toMatchObject({ positionSec: 20, isCompleted: true });
    });

    it('survives many quick saves without overwriting each other', async () => {
      await Promise.all([
        enqueuePendingProgress(entry('lesson-1', 10)),
        enqueuePendingProgress(entry('lesson-2', 20)),
        enqueuePendingProgress(entry('lesson-3', 30)),
      ]);

      expect(await getPendingProgress()).toHaveLength(3);
    });

    it('ignores a corrupted stored value', async () => {
      await AsyncStorage.setItem(PENDING_PROGRESS_KEY, '{not json');

      await enqueuePendingProgress(entry('lesson-1', 5));

      expect(await getPendingProgress()).toHaveLength(1);
    });
  });

  describe('removePendingProgress', () => {
    it('removes the entry, and the key once the queue is empty', async () => {
      await enqueuePendingProgress(entry('lesson-1', 5));

      await removePendingProgress('lesson-1');

      expect(await getPendingProgress()).toEqual([]);
      expect(await AsyncStorage.getItem(PENDING_PROGRESS_KEY)).toBeNull();
    });

    it('keeps an entry that was replaced by a newer one', async () => {
      await enqueuePendingProgress(entry('lesson-1', 5), () => 100);

      await removePendingProgress('lesson-1', 50);

      expect(await getPendingProgress()).toHaveLength(1);
    });
  });

  describe('flushPendingProgress', () => {
    it('sends the queued progress oldest first and empties the queue', async () => {
      await enqueuePendingProgress(entry('lesson-2', 20), () => 2000);
      await enqueuePendingProgress(entry('lesson-1', 90, { isCompleted: true }), () => 1000);
      const send = jest.fn().mockResolvedValue(OK);
      const onSent = jest.fn();

      const result = await flushPendingProgress({
        userId: 'user-1',
        send,
        onSent,
        now: () => 3000,
      });

      expect(send.mock.calls).toEqual([
        ['lesson-1', { positionSec: 90, isCompleted: true }],
        ['lesson-2', { positionSec: 20 }],
      ]);
      expect(result).toEqual({ sent: 2, kept: 0, dropped: 0 });
      expect(onSent).toHaveBeenCalledTimes(2);
      expect(await getPendingProgress()).toEqual([]);
    });

    it('stops at the first network error and keeps everything left queued', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10), () => 1000);
      await enqueuePendingProgress(entry('lesson-2', 20), () => 2000);
      const send = jest
        .fn()
        .mockRejectedValue(new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }));

      const result = await flushPendingProgress({ userId: 'user-1', send, now: () => 3000 });

      expect(send).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sent: 0, kept: 2, dropped: 0 });
      expect(await getPendingProgress()).toHaveLength(2);
    });

    it('keeps an entry after a 5xx and continues with the next one', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10), () => 1000);
      await enqueuePendingProgress(entry('lesson-2', 20), () => 2000);
      const send = jest
        .fn()
        .mockRejectedValueOnce(new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' }))
        .mockResolvedValueOnce(OK);

      const result = await flushPendingProgress({ userId: 'user-1', send, now: () => 3000 });

      expect(result).toEqual({ sent: 1, kept: 1, dropped: 0 });
      expect((await getPendingProgress()).map((item) => item.lessonId)).toEqual(['lesson-1']);
    });

    it('drops an entry the server will never accept (403)', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10), () => 1000);
      const send = jest
        .fn()
        .mockRejectedValue(new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'no' }));

      const result = await flushPendingProgress({ userId: 'user-1', send, now: () => 2000 });

      expect(result).toEqual({ sent: 0, kept: 0, dropped: 1 });
      expect(await getPendingProgress()).toEqual([]);
    });

    it('never sends the progress of another user, and keeps it', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10, { userId: 'someone-else' }), () => 1000);
      const send = jest.fn().mockResolvedValue(OK);

      const result = await flushPendingProgress({ userId: 'user-1', send, now: () => 2000 });

      expect(send).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, kept: 0, dropped: 0 });
      expect(await getPendingProgress()).toHaveLength(1);
    });

    it('does nothing while nobody is logged in', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10));
      const send = jest.fn().mockResolvedValue(OK);

      await flushPendingProgress({ userId: null, send });

      expect(send).not.toHaveBeenCalled();
    });

    it('drops entries older than 30 days instead of sending them', async () => {
      const day = 24 * 60 * 60 * 1000;
      await enqueuePendingProgress(entry('lesson-1', 10), () => 1000);
      const send = jest.fn().mockResolvedValue(OK);

      const result = await flushPendingProgress({
        userId: 'user-1',
        send,
        now: () => 1000 + 31 * day,
      });

      expect(send).not.toHaveBeenCalled();
      expect(result.dropped).toBe(1);
      expect(await getPendingProgress()).toEqual([]);
    });

    it('shares one run between concurrent calls (no double send)', async () => {
      await enqueuePendingProgress(entry('lesson-1', 10));
      const send = jest.fn().mockResolvedValue(OK);

      await Promise.all([
        flushPendingProgress({ userId: 'user-1', send }),
        flushPendingProgress({ userId: 'user-1', send }),
      ]);

      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});
