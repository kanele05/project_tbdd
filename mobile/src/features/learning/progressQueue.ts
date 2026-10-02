import AsyncStorage from '@react-native-async-storage/async-storage';

import { toAppError } from '@/lib/appError';
import type { LessonProgressResponse } from '@/types/api';

import type { SaveProgressBody } from './api';

/**
 * Offline queue of lesson progress (FR-24 exception / NFR-10).
 *
 * Writes are blocked while offline, but the last watched position must never be lost: the
 * newest position of each lesson is kept in AsyncStorage and sent when the network is back.
 * Only the latest value per lesson matters (last write wins), so the queue never grows beyond one
 * entry per lesson.
 */
export const PENDING_PROGRESS_KEY = 'elearning.pending-progress';

/** Entries older than this are dropped instead of being sent (the user moved on). */
const MAX_ENTRY_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type PendingProgress = {
  lessonId: string;
  courseId: string;
  /** Owner of the entry: a progress queued by user A is never sent with user B's token. */
  userId: string;
  positionSec: number;
  isCompleted: boolean;
  savedAt: number;
};

type PendingStore = Record<string, PendingProgress>;

function isPendingProgress(value: unknown): value is PendingProgress {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.lessonId === 'string' &&
    typeof entry.courseId === 'string' &&
    typeof entry.userId === 'string' &&
    typeof entry.positionSec === 'number' &&
    typeof entry.isCompleted === 'boolean' &&
    typeof entry.savedAt === 'number'
  );
}

async function readStore(): Promise<PendingStore> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const store: PendingStore = {};
    for (const [lessonId, entry] of Object.entries(parsed)) {
      if (isPendingProgress(entry)) store[lessonId] = entry;
    }
    return store;
  } catch {
    // A corrupted value is treated as an empty queue (and overwritten by the next write).
    return {};
  }
}

async function writeStore(store: PendingStore): Promise<void> {
  if (Object.keys(store).length === 0) {
    await AsyncStorage.removeItem(PENDING_PROGRESS_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_PROGRESS_KEY, JSON.stringify(store));
}

/** Read-modify-write operations are chained so two quick saves never overwrite each other. */
let writeChain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
}

/** Keep the newest position of the lesson; a completed lesson stays completed. */
export function enqueuePendingProgress(
  entry: Omit<PendingProgress, 'savedAt'>,
  now: () => number = Date.now,
): Promise<void> {
  return serialize(async () => {
    const store = await readStore();
    const previous = store[entry.lessonId];
    const isSameOwner = previous?.userId === entry.userId;
    store[entry.lessonId] = {
      ...entry,
      isCompleted: entry.isCompleted || (isSameOwner && previous?.isCompleted === true),
      savedAt: now(),
    };
    await writeStore(store);
  });
}

/**
 * Remove the entry of a lesson. With `savedAt` the entry is only removed when it was not
 * replaced by a newer one in the meantime.
 */
export function removePendingProgress(lessonId: string, savedAt?: number): Promise<void> {
  return serialize(async () => {
    const store = await readStore();
    const entry = store[lessonId];
    if (!entry) return;
    if (savedAt !== undefined && entry.savedAt !== savedAt) return;
    delete store[lessonId];
    await writeStore(store);
  });
}

/** All queued entries, oldest first. */
export async function getPendingProgress(): Promise<PendingProgress[]> {
  const store = await readStore();
  return Object.values(store).sort((a, b) => a.savedAt - b.savedAt);
}

/** Drop everything (tests, logout cleanups). */
export function clearPendingProgress(): Promise<void> {
  return serialize(async () => {
    await AsyncStorage.removeItem(PENDING_PROGRESS_KEY);
  });
}

/** Network failures and 5xx answers are worth retrying later; other 4xx never will succeed. */
export function isRetryableProgressError(error: unknown): boolean {
  const appError = toAppError(error);
  return appError.isNetworkError || appError.status >= 500;
}

/** `kept` = entries that stay queued for a later retry; `dropped` = never accepted or too old. */
export type FlushResult = { sent: number; kept: number; dropped: number };

export type FlushOptions = {
  /** Only entries of this user are sent. */
  userId: string | null;
  send: (lessonId: string, body: SaveProgressBody) => Promise<LessonProgressResponse>;
  /** Called after each entry was accepted by the server. */
  onSent?: (entry: PendingProgress, response: LessonProgressResponse) => void;
  now?: () => number;
};

let activeFlush: Promise<FlushResult> | null = null;

async function runFlush({
  userId,
  send,
  onSent,
  now = Date.now,
}: FlushOptions): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, kept: 0, dropped: 0 };
  if (!userId) return result;

  const entries = (await getPendingProgress()).filter((entry) => entry.userId === userId);
  for (const [index, entry] of entries.entries()) {
    if (now() - entry.savedAt > MAX_ENTRY_AGE_MS) {
      await removePendingProgress(entry.lessonId, entry.savedAt);
      result.dropped += 1;
      continue;
    }
    try {
      const response = await send(entry.lessonId, {
        positionSec: entry.positionSec,
        ...(entry.isCompleted ? { isCompleted: true } : {}),
      });
      await removePendingProgress(entry.lessonId, entry.savedAt);
      result.sent += 1;
      onSent?.(entry, response);
    } catch (error) {
      if (toAppError(error).isNetworkError) {
        // Still offline: stop here, everything left stays queued.
        result.kept += entries.length - index;
        break;
      }
      if (isRetryableProgressError(error)) {
        result.kept += 1;
        continue;
      }
      // 403 / 404 ...: the server will never accept it (e.g. lesson removed) - drop it.
      await removePendingProgress(entry.lessonId, entry.savedAt);
      result.dropped += 1;
    }
  }
  return result;
}

/**
 * Send the queued progress of `userId`, oldest first. Concurrent calls share one run, so an
 * online event and a screen mount happening together never double-send.
 */
export function flushPendingProgress(options: FlushOptions): Promise<FlushResult> {
  if (activeFlush) return activeFlush;
  activeFlush = runFlush(options).finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}
