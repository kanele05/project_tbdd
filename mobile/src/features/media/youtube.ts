const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_CLIP_SECONDS = 24 * 60 * 60;

export type YouTubeVideoSource = {
  videoId: string;
  startSeconds: number;
  endSeconds?: number;
};

export function isYouTubeHostUrl(source: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(source).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseYouTubeVideoSource(source: string): YouTubeVideoSource | null {
  try {
    const url = new URL(source);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) ||
      url.hash
    ) {
      return null;
    }

    let videoId: string | null = null;
    if (url.hostname.toLowerCase() === 'youtu.be' && /^\/[A-Za-z0-9_-]{11}$/.test(url.pathname)) {
      videoId = url.pathname.slice(1);
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else {
      return null;
    }

    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;
    if ([...url.searchParams.keys()].some((key) => !['v', 'start', 'end'].includes(key))) {
      return null;
    }
    if (['v', 'start', 'end'].some((key) => url.searchParams.getAll(key).length > 1)) {
      return null;
    }

    const startValue = url.searchParams.get('start');
    const startSeconds = startValue === null ? 0 : parseClipBound(startValue);
    if (startSeconds === null) return null;
    const endValue = url.searchParams.get('end');
    let endSeconds: number | undefined;
    if (endValue !== null) {
      const parsedEnd = parseClipBound(endValue);
      if (parsedEnd === null || parsedEnd <= startSeconds) return null;
      endSeconds = parsedEnd;
    }

    return { videoId, startSeconds, ...(endSeconds === undefined ? {} : { endSeconds }) };
  } catch {
    return null;
  }
}

function parseClipBound(value: string | null): number | null {
  if (value === null) return null;
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds <= MAX_CLIP_SECONDS ? seconds : null;
}

export function getClipRelativeTime(currentTime: number, source: YouTubeVideoSource): number {
  const relativeTime = Math.max(0, currentTime - source.startSeconds);
  const clipDuration =
    source.endSeconds === undefined
      ? Number.POSITIVE_INFINITY
      : source.endSeconds - source.startSeconds;
  return Math.min(relativeTime, clipDuration);
}
