import { STUDIO_LIMITS } from './limits';

/**
 * Parses what a teacher types in the lesson duration field: `mm:ss` ("12:34", "5:00") or
 * `h:mm:ss` ("1:02:05") into whole seconds. Returns `null` when it is not that shape or the value
 * is outside 1 s .. 6 h (BR-20).
 */
export function parseDurationInput(text: string): number | null {
  const match = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (match[1] !== undefined && minutes > 59) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  if (total < STUDIO_LIMITS.lessonMinSec || total > STUDIO_LIMITS.lessonMaxSec) return null;
  return total;
}

/** 754 -> "12:34", 3725 -> "1:02:05", 0 -> "0:00" (what the duration field shows). */
export function formatDurationInput(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours === 0) return `${minutes}:${ss}`;
  return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
}
