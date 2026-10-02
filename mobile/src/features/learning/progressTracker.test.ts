import { AppError } from '@/lib/appError';
import type { LessonProgressResponse } from '@/types/api';

import { LessonProgressTracker, type LessonProgressTrackerOptions } from './progressTracker';

function makeResponse(isCompleted = false, percent = 0): LessonProgressResponse {
  return { lessonProgress: { positionSec: 0, isCompleted }, courseProgressPercent: percent };
}

function setup(overrides: Partial<LessonProgressTrackerOptions> = {}) {
  let isOnline = true;
  const send = jest.fn().mockResolvedValue(makeResponse());
  const enqueue = jest.fn().mockResolvedValue(undefined);
  const dequeue = jest.fn().mockResolvedValue(undefined);
  const onSaved = jest.fn();
  const onRejected = jest.fn();
  const tracker = new LessonProgressTracker({
    lessonId: 'lesson-1',
    courseId: 'course-1',
    userId: 'user-1',
    durationSec: 600,
    send,
    enqueue,
    dequeue,
    onSaved,
    onRejected,
    isOnline: () => isOnline,
    ...overrides,
  });
  return {
    tracker,
    send,
    enqueue,
    dequeue,
    onSaved,
    onRejected,
    setOnline: (value: boolean) => {
      isOnline = value;
    },
  };
}

/** Feed one `timeUpdate` per second, like the player does. */
async function playSeconds(tracker: LessonProgressTracker, from: number, to: number) {
  for (let second = from; second <= to; second += 1) {
    await jest.advanceTimersByTimeAsync(1000);
    tracker.update(second);
  }
  await jest.advanceTimersByTimeAsync(0);
}

describe('LessonProgressTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves at most every 10 seconds (30 requests for 5 minutes, not 300)', async () => {
    const { tracker, send } = setup();

    await playSeconds(tracker, 1, 9);
    expect(send).not.toHaveBeenCalled();

    await playSeconds(tracker, 10, 10);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 10 });

    await playSeconds(tracker, 11, 300);
    expect(send).toHaveBeenCalledTimes(30);
  });

  it('flush saves the newest position when it changed (pause, switch, unmount, background)', async () => {
    const { tracker, send } = setup();

    await playSeconds(tracker, 1, 4);
    await tracker.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('lesson-1', { positionSec: 4 });
  });

  it('does not send the same position twice', async () => {
    const { tracker, send } = setup();

    await playSeconds(tracker, 1, 4);
    await tracker.flush();
    await tracker.flush();

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never sends before the player reported a real position', async () => {
    const { tracker, send, enqueue } = setup();

    await tracker.flush();

    expect(send).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('marks the lesson completed and saves immediately when 90 % is reached (BR-03)', async () => {
    const { tracker, send } = setup({ durationSec: 100 });

    await playSeconds(tracker, 1, 89);
    expect(send).not.toHaveBeenCalledWith(
      'lesson-1',
      expect.objectContaining({ isCompleted: true }),
    );

    tracker.update(90);
    await jest.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 90, isCompleted: true });
    expect(tracker.completed).toBe(true);
  });

  it('keeps sending isCompleted once the lesson is completed', async () => {
    const { tracker, send } = setup({ durationSec: 100 });

    tracker.update(95);
    await jest.advanceTimersByTimeAsync(0);
    tracker.update(30); // the user seeks back
    await tracker.flush();

    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 30, isCompleted: true });
  });

  it('completes the lesson at the full duration when the video plays to the end', async () => {
    const { tracker, send } = setup({ durationSec: 600 });

    await playSeconds(tracker, 1, 3);
    await tracker.markEnded();

    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 600, isCompleted: true });
  });

  it('floors the position and never sends more than the duration', async () => {
    const { tracker, send } = setup({ durationSec: 60 });

    tracker.update(12.9);
    await tracker.flush();
    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 12 });

    tracker.update(75);
    await tracker.flush();
    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 60, isCompleted: true });
  });

  it('ignores invalid positions', async () => {
    const { tracker, send } = setup();

    tracker.update(Number.NaN);
    tracker.update(-3);
    await tracker.flush();

    expect(send).not.toHaveBeenCalled();
  });

  it('reports each accepted save and clears the queued entry of the lesson', async () => {
    const response = makeResponse(false, 40);
    const { tracker, send, onSaved, dequeue } = setup();
    send.mockResolvedValue(response);

    await playSeconds(tracker, 1, 10);

    expect(onSaved).toHaveBeenCalledWith(response);
    expect(dequeue).toHaveBeenCalledWith('lesson-1');
  });

  describe('offline (FR-24 exception, NFR-10)', () => {
    it('queues the newest position instead of calling the API', async () => {
      const { tracker, send, enqueue, setOnline } = setup();
      setOnline(false);

      await playSeconds(tracker, 1, 10);
      await playSeconds(tracker, 11, 14);
      await tracker.flush();

      expect(send).not.toHaveBeenCalled();
      expect(enqueue).toHaveBeenLastCalledWith({
        lessonId: 'lesson-1',
        courseId: 'course-1',
        userId: 'user-1',
        positionSec: 14,
        isCompleted: false,
      });
    });

    it('queues the completion reached while offline', async () => {
      const { tracker, send, enqueue, setOnline } = setup({ durationSec: 100 });
      setOnline(false);

      tracker.update(92);
      await jest.advanceTimersByTimeAsync(0);

      expect(send).not.toHaveBeenCalled();
      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ positionSec: 92, isCompleted: true }),
      );
    });

    it('sends again as soon as the network is back', async () => {
      const { tracker, send, enqueue, setOnline } = setup();
      setOnline(false);
      await playSeconds(tracker, 1, 10);
      expect(enqueue).toHaveBeenCalledTimes(1);

      setOnline(true);
      await playSeconds(tracker, 11, 20);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('lesson-1', { positionSec: 20 });
    });

    it('queues the position when the request fails with a network error', async () => {
      const { tracker, send, enqueue } = setup();
      send.mockRejectedValue(
        new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'No connection' }),
      );

      await playSeconds(tracker, 1, 10);

      expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ positionSec: 10 }));
    });

    it('queues the position when the server answers 5xx', async () => {
      const { tracker, send, enqueue } = setup();
      send.mockRejectedValue(
        new AppError({ status: 503, code: 'INTERNAL_ERROR', message: 'Unavailable' }),
      );

      await playSeconds(tracker, 1, 10);

      expect(enqueue).toHaveBeenCalledTimes(1);
    });

    it('does not queue a save the server rejected for good (403)', async () => {
      const { tracker, send, enqueue, onRejected } = setup();
      send.mockRejectedValue(
        new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'Not enrolled' }),
      );

      await playSeconds(tracker, 1, 10);

      expect(enqueue).not.toHaveBeenCalled();
      expect(onRejected).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps one request in flight and then saves the newest position', async () => {
    let resolveFirst: (value: LessonProgressResponse) => void = () => undefined;
    const { tracker, send } = setup();
    send.mockImplementationOnce(
      () =>
        new Promise<LessonProgressResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    await playSeconds(tracker, 1, 10);
    expect(send).toHaveBeenCalledTimes(1);

    tracker.update(15);
    const pending = tracker.flush();
    expect(send).toHaveBeenCalledTimes(1);

    resolveFirst(makeResponse());
    await pending;

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith('lesson-1', { positionSec: 15 });
  });
});
