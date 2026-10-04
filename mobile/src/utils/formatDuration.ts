import { i18n } from '@/i18n';

function safeSeconds(totalSeconds: number): number {
  return Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
}

/**
 * Total duration for cards / My Courses: 8700 -> "2 hrs 25 mins" (en) / "2 giờ 25 phút" (vi),
 * 3600 -> "1 hr", 1500 -> "25 mins".
 */
export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(Math.round(safeSeconds(totalSeconds)) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return i18n.t('common:duration.minute', { count: minutes });
  const hoursText = i18n.t('common:duration.hour', { count: hours });
  if (minutes === 0) return hoursText;
  return `${hoursText} ${i18n.t('common:duration.minute', { count: minutes })}`;
}

/** Lesson length in the curriculum list: 83 -> "01:23 mins" (en) / "01:23 phút" (vi). */
export function formatLessonDuration(totalSeconds: number): string {
  const safe = Math.round(safeSeconds(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const time = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return i18n.t('common:duration.lesson', { time });
}

/** Whole hours for the benefits list ("14 hours on-demand video"): 50400 -> "14 hours". */
export function formatTotalHours(totalSeconds: number): string {
  const safe = safeSeconds(totalSeconds);
  const hours = Math.round(safe / 3600);
  if (hours < 1) return formatDuration(safe);
  return i18n.t('common:duration.hourLong', { count: hours });
}
