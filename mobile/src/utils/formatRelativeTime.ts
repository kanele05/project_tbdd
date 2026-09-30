import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * ISO date -> "A day ago", "5 days ago" (capitalized like the design).
 * `now` is injectable for tests.
 */
export function formatRelativeTime(isoDate: string, now: Date | number = Date.now()): string {
  const date = dayjs(isoDate);
  if (!date.isValid()) return '';
  return capitalize(date.from(dayjs(now)));
}
