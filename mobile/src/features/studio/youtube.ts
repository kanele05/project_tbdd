const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const SHORT_HOST = 'youtu.be';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_CLIP_SECONDS = 24 * 60 * 60;

/** Seconds as `90`, `90s` or the YouTube share form `1h2m3s` / `1m30s`. */
const DURATION_PATTERN = /^(?:(\d{1,2})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s?)?$/;

/** `undefined` = parameter absent, `null` = malformed, number = seconds. */
function parseSeconds(value: string | null): number | null | undefined {
  if (value === null) return undefined;
  const match = DURATION_PATTERN.exec(value);
  if (!value || !match) return null;
  const [, hours = '0', minutes = '0', secs = '0'] = match;
  const seconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(secs);
  return seconds <= MAX_CLIP_SECONDS ? seconds : null;
}

/**
 * Client-side twin of the server's `normalizeYouTubeUrl` (FR-40): any YouTube watch / youtu.be
 * link becomes `https://www.youtube.com/watch?v=<id>[&start=<s>][&end=<s>]` (`t=` of a share link
 * counts as `start`). Returns `null` for anything that is not a valid YouTube link.
 */
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

  const start = parseSeconds(url.searchParams.get('start') ?? url.searchParams.get('t'));
  const end = parseSeconds(url.searchParams.get('end'));
  if (start === null || end === null) return null;
  if (end !== undefined && end <= (start ?? 0)) return null;

  let normalized = `https://www.youtube.com/watch?v=${videoId}`;
  if (start !== undefined && start > 0) normalized += `&start=${start}`;
  if (end !== undefined) normalized += `&end=${end}`;
  return normalized;
}

/** 11-character video id of a normalized link (for the thumbnail), or `null`. */
export function getYouTubeVideoId(input: string): string | null {
  const normalized = normalizeYouTubeUrl(input);
  if (!normalized) return null;
  return new URL(normalized).searchParams.get('v');
}
