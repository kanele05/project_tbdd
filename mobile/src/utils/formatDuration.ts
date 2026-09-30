function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/**
 * Total duration for cards / My Courses: 8700 -> "2 hrs 25 mins", 3600 -> "1 hr", 1500 -> "25 mins".
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const totalMinutes = Math.floor(safe / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return pluralize(minutes, 'min', 'mins');
  if (minutes === 0) return pluralize(hours, 'hr', 'hrs');
  return `${pluralize(hours, 'hr', 'hrs')} ${pluralize(minutes, 'min', 'mins')}`;
}

/** Lesson length in the curriculum list: 83 -> "01:23 mins". */
export function formatLessonDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} mins`;
}

/** Whole hours for the benefits list ("14 hours on-demand video"): 50400 -> "14 hours". */
export function formatTotalHours(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const hours = Math.round(safe / 3600);
  if (hours < 1) return formatDuration(safe);
  return pluralize(hours, 'hour', 'hours');
}
