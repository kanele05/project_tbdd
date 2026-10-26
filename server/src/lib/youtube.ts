/**
 * Chuẩn hóa link YouTube của bài học (FR-40): mọi dạng hợp lệ được đổi về
 * `https://www.youtube.com/watch?v=<id>[&start=<giây>][&end=<giây>]` - đúng định dạng mà app (mobile
 * `features/media/youtube.ts`) và seed (`externalCoursePreviewManifest`) đang dùng.
 */
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const SHORT_HOST = 'youtu.be';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_CLIP_SECONDS = 24 * 60 * 60;

// Số giây: `90`, `90s` hoặc dạng link chia sẻ YouTube `1h2m3s` / `1m30s`.
const DURATION_PATTERN = /^(?:(\d{1,2})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s?)?$/;

function parseSeconds(value: string | null): number | null | undefined {
  if (value === null) return undefined; // không có tham số
  const match = DURATION_PATTERN.exec(value);
  if (!value || !match) return null; // sai định dạng
  const [, hours = '0', minutes = '0', secs = '0'] = match;
  const seconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(secs);
  return seconds <= MAX_CLIP_SECONDS ? seconds : null;
}

/** Trả `null` nếu không phải link YouTube hợp lệ (sai host, thiếu/sai id, `end <= start`, ...). */
export function normalizeYouTubeUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  let videoId: string | null;
  if (host === SHORT_HOST) {
    videoId = url.pathname.slice(1);
  } else if (WATCH_HOSTS.has(host) && url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else {
    return null;
  }
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;

  // `t=` của link chia sẻ youtu.be được hiểu như `start=`.
  const start = parseSeconds(url.searchParams.get('start') ?? url.searchParams.get('t'));
  const end = parseSeconds(url.searchParams.get('end'));
  if (start === null || end === null) return null;
  if (end !== undefined && end <= (start ?? 0)) return null;

  const normalized = new URL('https://www.youtube.com/watch');
  normalized.searchParams.set('v', videoId);
  if (start !== undefined && start > 0) normalized.searchParams.set('start', String(start));
  if (end !== undefined) normalized.searchParams.set('end', String(end));
  return normalized.toString();
}
