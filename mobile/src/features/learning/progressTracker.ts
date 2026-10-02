import { onlineManager } from '@tanstack/react-query';

import { LESSON_COMPLETE_RATIO, PROGRESS_SAVE_INTERVAL_MS } from '@/constants/config';
import type { LessonProgressResponse } from '@/types/api';

import type { SaveProgressBody } from './api';
import {
  enqueuePendingProgress,
  isRetryableProgressError,
  removePendingProgress,
  type PendingProgress,
} from './progressQueue';

export type LessonProgressTrackerOptions = {
  lessonId: string;
  courseId: string;
  userId: string;
  durationSec: number;
  /** The lesson was already completed in an earlier session (stays completed). */
  isInitiallyCompleted?: boolean;
  /** Minimum time between two periodic saves. Default 10 s (PLAN.md FR-16). */
  intervalMs?: number;
  send: (lessonId: string, body: SaveProgressBody) => Promise<LessonProgressResponse>;
  /** Called after each successful save. */
  onSaved?: (response: LessonProgressResponse) => void;
  /** Called when the server rejects the save for good (4xx): it is not queued. */
  onRejected?: (error: unknown) => void;
  isOnline?: () => boolean;
  enqueue?: (entry: Omit<PendingProgress, 'savedAt'>) => Promise<void>;
  dequeue?: (lessonId: string) => Promise<void>;
  now?: () => number;
};

/**
 * Decides *when* the position of the lesson being watched is saved (PLAN.md FR-16, BR-03,
 * NFR-10). It is a plain class (no React) so the timing rules are unit-testable:
 *
 * - `update(position)` is fed by the player's 1 s `timeUpdate`; it saves at most every
 *   `intervalMs` (10 s) so 5 minutes of video cost ~30 requests instead of ~300;
 * - crossing 90 % of the duration marks the lesson completed and saves right away;
 * - `flush()` forces a save (pause, lesson switch, unmount, app to background);
 * - `markEnded()` is the `playToEnd` case: completed at the full duration;
 * - while offline, or when the network call fails, only the newest position is queued in
 *   AsyncStorage (`progressQueue`) and synced later;
 * - nothing is ever sent before the first real position was reported, so leaving the screen
 *   before the video loaded cannot overwrite the saved position with 0.
 */
export class LessonProgressTracker {
  private readonly options: LessonProgressTrackerOptions;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private latestPosition: number | null = null;
  private isCompleted: boolean;
  private lastSavedPosition: number | null = null;
  private lastSavedCompleted: boolean;
  private lastSaveAt: number;
  private inFlight: Promise<void> | null = null;
  private needsAnotherSave = false;

  constructor(options: LessonProgressTrackerOptions) {
    this.options = options;
    this.intervalMs = options.intervalMs ?? PROGRESS_SAVE_INTERVAL_MS;
    this.now = options.now ?? Date.now;
    this.isCompleted = options.isInitiallyCompleted === true;
    this.lastSavedCompleted = this.isCompleted;
    this.lastSaveAt = this.now();
  }

  /** Feed the current playback position (seconds). Cheap: only saves when the rules say so. */
  update(positionSec: number): void {
    if (!Number.isFinite(positionSec) || positionSec < 0) return;
    this.latestPosition = positionSec;

    const { durationSec } = this.options;
    const hasReachedThreshold =
      durationSec > 0 && positionSec >= durationSec * LESSON_COMPLETE_RATIO;
    if (hasReachedThreshold && !this.isCompleted) {
      this.isCompleted = true;
      void this.save();
      return;
    }
    if (this.now() - this.lastSaveAt >= this.intervalMs) void this.save();
  }

  /** The video played to its end: completed (BR-03). Resolves when the save is done/queued. */
  markEnded(): Promise<void> {
    this.isCompleted = true;
    const { durationSec } = this.options;
    this.latestPosition = durationSec > 0 ? durationSec : (this.latestPosition ?? 0);
    return this.save();
  }

  /** Save the newest known position now (no-op when nothing changed since the last save). */
  flush(): Promise<void> {
    return this.save();
  }

  /** True once the player reported at least one real position (something worth refreshing). */
  get hasReported(): boolean {
    return this.latestPosition !== null;
  }

  /** Whether the lesson counts as completed (90 % reached, ended, or already completed). */
  get completed(): boolean {
    return this.isCompleted;
  }

  private async save(): Promise<void> {
    if (this.latestPosition === null) return;
    if (this.inFlight) {
      this.needsAnotherSave = true;
      return this.inFlight;
    }
    this.inFlight = this.performSave().finally(() => {
      this.inFlight = null;
    });
    await this.inFlight;
    if (this.needsAnotherSave) {
      this.needsAnotherSave = false;
      await this.save();
    }
  }

  private async performSave(): Promise<void> {
    if (this.latestPosition === null) return;
    const { durationSec, lessonId, courseId, userId } = this.options;
    const capped =
      durationSec > 0 ? Math.min(this.latestPosition, durationSec) : this.latestPosition;
    const positionSec = Math.floor(capped);
    const isCompleted = this.isCompleted;
    if (positionSec === this.lastSavedPosition && isCompleted === this.lastSavedCompleted) return;

    this.lastSaveAt = this.now();
    const body: SaveProgressBody = { positionSec, ...(isCompleted ? { isCompleted: true } : {}) };
    const entry = { lessonId, courseId, userId, positionSec, isCompleted };
    const isOnline = this.options.isOnline ?? (() => onlineManager.isOnline());

    if (!isOnline()) {
      await this.queue(entry);
      this.markSaved(positionSec, isCompleted);
      return;
    }

    let response: LessonProgressResponse;
    try {
      response = await this.options.send(lessonId, body);
    } catch (error) {
      if (isRetryableProgressError(error)) {
        await this.queue(entry);
        this.markSaved(positionSec, isCompleted);
        return;
      }
      this.options.onRejected?.(error);
      return;
    }

    this.markSaved(positionSec, isCompleted);
    await this.dequeue(lessonId);
    this.options.onSaved?.(response);
  }

  /** The server now has a newer value than anything queued for this lesson. */
  private async dequeue(lessonId: string): Promise<void> {
    try {
      await (this.options.dequeue ?? removePendingProgress)(lessonId);
    } catch (error) {
      if (__DEV__) console.warn('Could not clear queued lesson progress', error);
    }
  }

  private markSaved(positionSec: number, isCompleted: boolean): void {
    this.lastSavedPosition = positionSec;
    this.lastSavedCompleted = isCompleted;
  }

  private async queue(entry: Omit<PendingProgress, 'savedAt'>): Promise<void> {
    try {
      await (this.options.enqueue ?? enqueuePendingProgress)(entry);
    } catch (error) {
      if (__DEV__) console.warn('Could not queue lesson progress', error);
    }
  }
}
