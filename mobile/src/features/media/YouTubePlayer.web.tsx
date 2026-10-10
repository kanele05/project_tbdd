import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { fontFamily, layout, makeStyles, spacing, useTheme } from '@/theme';

import { getClipRelativeTime, parseYouTubeVideoSource } from './youtube';
import type { YouTubePlayerProps } from './YouTubePlayer';

type YouTubePlayerInstance = {
  destroy: () => void;
  getCurrentTime: () => number;
  getIframe: () => HTMLIFrameElement;
};

type YouTubePlayerApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: { target: YouTubePlayerInstance }) => void;
        onStateChange: (event: { data: number; target: YouTubePlayerInstance }) => void;
        onError: (event: { target: YouTubePlayerInstance }) => void;
      };
    },
  ) => YouTubePlayerInstance;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YouTubePlayerApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubePlayerApi> | undefined;

function loadYouTubeApi(): Promise<YouTubePlayerApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let script = document.getElementById('youtube-iframe-api') as HTMLScriptElement | null;
    let isSettled = false;
    let timeout: number | undefined;
    const reset = () => {
      apiPromise = undefined;
      if (window.onYouTubeIframeAPIReady === onReady) {
        window.onYouTubeIframeAPIReady = previousReady;
      }
    };
    const fail = () => {
      if (isSettled) return;
      isSettled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      script?.remove();
      reset();
      reject(new Error('YouTube player API failed to load'));
    };
    const onReady = () => {
      try {
        previousReady?.();
      } catch {
        fail();
        return;
      }
      if (!window.YT?.Player) {
        fail();
        return;
      }
      isSettled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (script) script.onerror = null;
      reset();
      resolve(window.YT);
    };
    window.onYouTubeIframeAPIReady = onReady;
    timeout = window.setTimeout(fail, 15_000);
    if (!script) {
      script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = fail;
      document.head.appendChild(script);
    } else {
      script.onerror = fail;
    }
  });
  return apiPromise;
}

export function YouTubePlayer({ ...props }: YouTubePlayerProps) {
  return <WebYouTubePlayer key={props.source} {...props} />;
}

function WebYouTubePlayer({
  source,
  title,
  initialPositionSec = 0,
  loadingLabel,
  errorLabel,
  retryLabel,
  sourceLabel,
  openSourceLabel,
  onRetry,
  onProgress,
  onPaused,
  onEnded,
}: YouTubePlayerProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const video = useMemo(() => parseYouTubeVideoSource(source), [source]);
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(null);
  const onProgressRef = useRef(onProgress);
  const onPausedRef = useRef(onPaused);
  const onEndedRef = useRef(onEnded);
  const hasReportedEndedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(!video);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onPausedRef.current = onPaused;
    onEndedRef.current = onEnded;
  }, [onProgress, onPaused, onEnded]);

  const iframeUrl = useMemo(() => {
    if (!video || typeof window === 'undefined') return '';
    const url = new URL(`https://www.youtube.com/embed/${video.videoId}`);
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('origin', window.location.origin);
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('rel', '0');
    const playbackStart = video.startSeconds + Math.max(0, initialPositionSec);
    if (playbackStart > 0) url.searchParams.set('start', String(playbackStart));
    if (video.endSeconds !== undefined) url.searchParams.set('end', String(video.endSeconds));
    return url.toString();
  }, [video, initialPositionSec]);

  useEffect(() => {
    if (!video || !iframeElement) return;
    let isDisposed = false;
    let player: InstanceType<YouTubePlayerApi['Player']> | undefined;
    let progressTimer: number | undefined;
    const readyTimeout = window.setTimeout(() => setHasError(true), 20_000);
    const clearProgress = () => {
      if (progressTimer !== undefined) window.clearInterval(progressTimer);
      progressTimer = undefined;
    };

    void loadYouTubeApi()
      .then((api) => {
        if (isDisposed) return;
        player = new api.Player(iframeElement, {
          events: {
            onReady: ({ target }) => {
              if (isDisposed || target !== player) return;
              window.clearTimeout(readyTimeout);
              setIsReady(true);
              setHasError(false);
              target.getIframe().setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            },
            onStateChange: ({ data, target }) => {
              if (!player || target !== player || isDisposed) return;
              if (data === api.PlayerState.PLAYING) {
                clearProgress();
                if (onProgressRef.current) {
                  progressTimer = window.setInterval(() => {
                    if (!player) return;
                    onProgressRef.current?.(getClipRelativeTime(player.getCurrentTime(), video));
                  }, 1000);
                }
              } else {
                clearProgress();
                if (data === api.PlayerState.PAUSED) {
                  const positionSec = getClipRelativeTime(player.getCurrentTime(), video);
                  onProgressRef.current?.(positionSec);
                  onPausedRef.current?.(positionSec);
                } else if (data === api.PlayerState.ENDED && !hasReportedEndedRef.current) {
                  hasReportedEndedRef.current = true;
                  onProgressRef.current?.(getClipRelativeTime(player.getCurrentTime(), video));
                  onEndedRef.current?.();
                }
              }
            },
            onError: ({ target }) => {
              if (!isDisposed && target === player) setHasError(true);
            },
          },
        });
      })
      .catch(() => {
        if (!isDisposed) setHasError(true);
      });

    return () => {
      isDisposed = true;
      window.clearTimeout(readyTimeout);
      clearProgress();
      player?.destroy();
    };
  }, [iframeElement, video]);

  return (
    <View style={styles.container}>
      {video && !hasError
        ? createElement('iframe', {
            ref: setIframeElement,
            src: iframeUrl,
            title,
            allow: 'encrypted-media; picture-in-picture; fullscreen',
            allowFullScreen: true,
            referrerPolicy: 'strict-origin-when-cross-origin',
            style: styles.iframe as CSSProperties,
          })
        : null}
      {!isReady && !hasError ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.primaryText} />
          <AppText variant="caption" color="textSecondary" accessibilityLabel={loadingLabel}>
            {loadingLabel}
          </AppText>
        </View>
      ) : null}
      {hasError ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <AppText variant="body" color="textPrimary" align="center">
            {errorLabel}
          </AppText>
          {onRetry ? <Button title={retryLabel} variant="outline" onPress={onRetry} /> : null}
        </View>
      ) : null}
      <View style={styles.sourceRow}>
        <AppText variant="caption" color="textMuted">
          {sourceLabel}
        </AppText>
        {video
          ? createElement(
              'a',
              {
                href: source,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: styles.sourceLink as CSSProperties,
              },
              openSourceLabel,
            )
          : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    width: '100%',
    alignItems: 'stretch',
    gap: spacing.sm,
    backgroundColor: t.colors.background,
  },
  iframe: {
    width: '100%',
    minWidth: 200,
    minHeight: 200,
    aspectRatio: 16 / 9,
    border: 0,
    backgroundColor: t.colors.scrim,
  },
  status: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sourceRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
  },
  sourceLink: {
    color: t.colors.primaryText,
    fontFamily: fontFamily.bodySemiBold,
    textDecorationLine: 'underline',
    textUnderlineOffset: 3,
  },
}));
