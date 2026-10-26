import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { getCurrentLanguage } from '@/i18n';

dayjs.extend(relativeTime);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * ISO date -> "A day ago" / "Một ngày trước" (capitalized like the design), in the UI language.
 * `now` is injectable for tests.
 */
export function formatRelativeTime(isoDate: string, now: Date | number = Date.now()): string {
  const text = formatRelativeTimeInline(isoDate, now);
  return text ? capitalize(text) : '';
}

/**
 * Same as `formatRelativeTime` but not capitalized, for text that follows a prefix:
 * "Gửi 1 phút trước", "Submitted a day ago".
 */
export function formatRelativeTimeInline(isoDate: string, now: Date | number = Date.now()): string {
  const date = dayjs(isoDate).locale(getCurrentLanguage());
  if (!date.isValid()) return '';
  return date.from(dayjs(now));
}
