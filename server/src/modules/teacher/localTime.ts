/**
 * BR-16: giờ hiện tại của giảng viên theo múi giờ IANA (`timezone`), định dạng `hh:mm A` ("09:30 AM").
 * Ghép từng phần thủ công vì ICU mới chèn khoảng trắng hẹp (U+202F) trước AM/PM.
 * Trả `null` khi thiếu múi giờ hoặc tên múi giờ không hợp lệ (UI sẽ ẩn giờ).
 */
export function formatLocalTime(
  timezone: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(now);
    const pick = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';
    const hour = pick('hour');
    const minute = pick('minute');
    const period = pick('dayPeriod').toUpperCase();
    if (!hour || !minute || !period) return null;
    return `${hour}:${minute} ${period}`;
  } catch {
    // RangeError: múi giờ không hợp lệ.
    return null;
  }
}
