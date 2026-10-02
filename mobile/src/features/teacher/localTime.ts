import { useEffect, useState } from 'react';

const MINUTE_MS = 60 * 1000;

/**
 * Current time of a teacher in their IANA `timezone`, as `hh:mm A` (BR-16): "09:30 AM".
 * The parts are assembled by hand because newer ICU versions put a narrow no-break space
 * before AM/PM. Returns `null` for a missing or unknown timezone (the UI then hides the time).
 */
export function formatLocalTime(timezone: string | null | undefined, now: Date): string | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(now);
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    const hour = pick('hour');
    const minute = pick('minute');
    const period = pick('dayPeriod').toUpperCase();
    if (!hour || !minute || !period) return null;
    return `${hour}:${minute} ${period}`;
  } catch {
    // RangeError: the timezone is not a valid IANA name on this device.
    return null;
  }
}

/** "New York - 09:30 AM", or just the part that is known; `null` when neither is. */
export function formatTeacherPlace(
  location: string | null | undefined,
  timezone: string | null | undefined,
  now: Date,
): string | null {
  const time = formatLocalTime(timezone, now);
  const place = location?.trim() || null;
  if (place && time) return `${place} - ${time}`;
  return place ?? time;
}

/** Re-renders every minute so the displayed local time never goes stale while the screen is open. */
export function useNow(intervalMs: number = MINUTE_MS): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
