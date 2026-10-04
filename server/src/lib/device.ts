/** Mô tả thiết bị + rút gọn IP để hiển thị ở "Thiết bị đăng nhập" (AUTH-01) mà không lưu dữ liệu thừa. */

const DEVICE_NAME_MAX = 80;
const USER_AGENT_MAX = 255;

/** IPv4 -> `a.b.c.x`; IPv6 -> 3 nhóm đầu + `::x`; IPv4-mapped (`::ffff:1.2.3.4`) xử lý như IPv4; loopback `::1` giữ nguyên. */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip === '::1') return ip; // loopback (dev) - không phải dữ liệu cá nhân, giữ nguyên cho dễ đọc
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  const value = mapped?.[1] ?? ip;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return `${value.split('.').slice(0, 3).join('.')}.x`;
  }
  if (value.includes(':')) {
    const groups = value.split(':').filter((g) => g !== '');
    return `${groups.slice(0, 3).join(':')}::x`;
  }
  return null;
}

export function truncateUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  return userAgent.slice(0, USER_AGENT_MAX);
}

function detectOs(ua: string): string | null {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod|iOS/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux|X11/i.test(ua)) return 'Linux';
  return null;
}

function detectClient(ua: string): string | null {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  if (/okhttp|CFNetwork|Expo|ReactNative/i.test(ua)) return 'App';
  return null;
}

/**
 * Tên thiết bị: ưu tiên tên do app gửi lên (vd. "Pixel 7 · Expo Go"), nếu không thì đoán từ User-Agent
 * ("Chrome on Windows"). Không đoán được -> "Unknown device".
 */
export function describeDevice(
  userAgent: string | null | undefined,
  clientName?: string | null,
): string {
  const named = clientName?.trim();
  if (named) return named.slice(0, DEVICE_NAME_MAX);
  if (!userAgent) return 'Unknown device';
  const client = detectClient(userAgent);
  const os = detectOs(userAgent);
  if (client && os) return `${client} on ${os}`;
  return client ?? os ?? 'Unknown device';
}
