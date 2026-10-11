import type { FeatherIconName } from '@/components/ui/icons';

/** "Oct 4, 2026, 08:00": the last-active time of a signed-in device. */
export const LAST_ACTIVE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Browser names / OSes the server reports for web sessions ("Chrome on Windows"). */
const DESKTOP_PATTERN = /windows|macos|linux|chrome|edge|firefox|safari|opera|browser/i;

export function getDeviceIcon(deviceName: string): FeatherIconName {
  return DESKTOP_PATTERN.test(deviceName) ? 'monitor' : 'smartphone';
}
