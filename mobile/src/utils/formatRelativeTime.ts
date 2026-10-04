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
  const date = dayjs(isoDate).locale(getCurrentLanguage());
  if (!date.isValid()) return '';
  return capitalize(date.from(dayjs(now)));
}
