import { API_URL, LESSON_COMPLETE_RATIO } from '@/constants/config';
import type { LessonDetail } from '@/types/api';

/**
 * Where playback starts (PLAN.md FR-16): the saved position. A lesson that was already watched to
 * the end (>= 90 %, or within the last second) restarts from 0 so "watch again" does not end
 * right away.
 */
export function getResumePosition(
  lesson: Pick<LessonDetail, 'positionSec' | 'durationSec' | 'isCompleted'>,
): number {
  const { positionSec, durationSec, isCompleted } = lesson;
  if (!Number.isFinite(positionSec) || positionSec <= 0) return 0;
  if (durationSec > 0) {
    if (positionSec >= durationSec - 1) return 0;
    if (isCompleted && positionSec >= durationSec * LESSON_COMPLETE_RATIO) return 0;
  }
  return positionSec;
}

/** Server-relative media paths (`/static/video.mp4`) become absolute with the API origin. */
export function resolveVideoUrl(url: string, apiUrl: string = API_URL): string {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = apiUrl.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** "UX Foundation: Introduction to User Experience Design" -> "UX Foundation" (header title). */
export function getShortCourseTitle(title: string): string {
  const [head] = title.split(':');
  return (head ?? title).trim() || title;
}

/** Seek a player (a plain function: players are native objects the render rules cannot mutate). */
export function seekPlayer(player: { currentTime: number }, positionSec: number): void {
  player.currentTime = positionSec;
}
