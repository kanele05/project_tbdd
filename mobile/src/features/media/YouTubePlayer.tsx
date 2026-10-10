import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { API_URL } from '@/constants/config';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

import { getClipRelativeTime, isYouTubeHostUrl, parseYouTubeVideoSource } from './youtube';

export type YouTubePlayerProps = {
  source: string;
  title: string;
  initialPositionSec?: number;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  sourceLabel: string;
  openSourceLabel: string;
  onRetry?: () => void;
  onProgress?: (positionSec: number) => void;
  onPaused?: (positionSec: number) => void;
  onEnded?: () => void;
};

type PlayerMessage =
  | { type: 'ready' }
  | { type: 'playing' }
  | { type: 'paused'; currentTime: number }
  | { type: 'progress'; currentTime: number }
  | { type: 'ended'; currentTime: number }
  | { type: 'error'; code: number };

function getApiOrigin(): string {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'https://localhost';
  }
}

function createPlayerHtml(videoId: string, startSeconds: number, endSeconds: number | undefined) {
  const origin = getApiOrigin();
  const endParameter = endSeconds === undefined ? '' : `,end:${endSeconds}`;
  const originJson = JSON.stringify(origin);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#000}iframe{width:100%;height:100%;border:0}</style></head><body><div id="player"></div><script>
var player, timer, ended=false;
function send(type, currentTime, code){
  if(!window.ReactNativeWebView) return;
  window.ReactNativeWebView.postMessage(JSON.stringify({type:type,currentTime:currentTime,code:code}));
}
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{width:'100%',height:'100%',videoId:${JSON.stringify(videoId)},playerVars:{autoplay:0,playsinline:1,rel:0,start:${startSeconds}${endParameter},origin:${originJson}},events:{onReady:function(event){if(event.target!==player)return;send('ready')},onStateChange:function(event){
    if(event.target!==player)return;
    if(event.data===YT.PlayerState.PLAYING){clearInterval(timer);timer=setInterval(function(){send('progress',player.getCurrentTime())},1000);send('playing');return;}
    clearInterval(timer);
    if(event.data===YT.PlayerState.PAUSED){send('paused',player.getCurrentTime());return;}
    if(event.data===YT.PlayerState.ENDED&&!ended){ended=true;send('ended',player.getCurrentTime());}
  },onError:function(event){if(event.target===player)send('error',0,event.data)}}});
}
var api=document.createElement('script');api.src='https://www.youtube.com/iframe_api';api.onerror=function(){send('error',0,153)};document.head.appendChild(api);
window.addEventListener('beforeunload',function(){clearInterval(timer);if(player)player.destroy()});
</script></body></html>`;
}

function parsePlayerMessage(data: string): PlayerMessage | null {
  try {
    const value: unknown = JSON.parse(data);
    if (!value || typeof value !== 'object') return null;
    const message = value as Record<string, unknown>;
    if (message.type === 'ready' || message.type === 'playing') return { type: message.type };
    if (message.type === 'error' && typeof message.code === 'number') {
      return { type: 'error', code: message.code };
    }
    if (
      (message.type === 'paused' || message.type === 'progress' || message.type === 'ended') &&
      typeof message.currentTime === 'number' &&
      Number.isFinite(message.currentTime)
    ) {
      return { type: message.type, currentTime: message.currentTime };
    }
    return null;
  } catch {
    return null;
  }
}

function isAllowedNavigation(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      url === 'about:blank' ||
      parsed.origin === getApiOrigin() ||
      (parsed.protocol === 'https:' &&
        ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(
          parsed.hostname,
        ))
    );
  } catch {
    return false;
  }
}

/**
 * Gate for WebView navigations. Sub-frames (the YouTube iframe) may load Google / YouTube hosts;
 * a top-level navigation away from the player page (the "Watch on YouTube" logo, the title link)
 * would replace the player and drop the bridge, so it is cancelled and opened in the system browser.
 */
export function shouldLoadPlayerRequest(request: { url: string; isTopFrame?: boolean }): boolean {
  if (request.isTopFrame === true && !isPlayerPage(request.url)) {
    if (isYouTubeHostUrl(request.url)) void Linking.openURL(request.url).catch(() => undefined);
    return false;
  }
  return isAllowedNavigation(request.url);
}

function isPlayerPage(url: string): boolean {
  try {
    return url === 'about:blank' || new URL(url).origin === getApiOrigin();
  } catch {
    return false;
  }
}

export function YouTubePlayer({ ...props }: YouTubePlayerProps) {
  return <NativeYouTubePlayer key={props.source} {...props} />;
}

function NativeYouTubePlayer({
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
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(!video);
  const hasReportedEndedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onPausedRef = useRef(onPaused);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onPausedRef.current = onPaused;
    onEndedRef.current = onEnded;
  }, [onProgress, onPaused, onEnded]);

  useEffect(() => {
    if (!video || isReady || hasError) return;
    const timeout = setTimeout(() => setHasError(true), 20_000);
    return () => clearTimeout(timeout);
  }, [video, isReady, hasError]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const expectedOrigin = getApiOrigin();
    try {
      if (new URL(event.nativeEvent.url).origin !== expectedOrigin) return;
    } catch {
      return;
    }
    const message = parsePlayerMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'ready') {
      setIsReady(true);
      setHasError(false);
    } else if (message.type === 'error') {
      setHasError(true);
    } else if (message.type === 'progress' || message.type === 'paused') {
      if (!video) return;
      const positionSec = getClipRelativeTime(message.currentTime, video);
      onProgressRef.current?.(positionSec);
      if (message.type === 'paused') onPausedRef.current?.(positionSec);
    } else if (message.type === 'ended') {
      if (hasReportedEndedRef.current) return;
      hasReportedEndedRef.current = true;
      if (video) onProgressRef.current?.(getClipRelativeTime(message.currentTime, video));
      onEndedRef.current?.();
    }
  };

  const openSource = () => {
    if (!video) return;
    void Linking.openURL(source).catch(() => setHasError(true));
  };

  return (
    <View style={styles.container}>
      {video && !hasError ? (
        <WebView
          key={source}
          source={{
            html: createPlayerHtml(
              video.videoId,
              video.startSeconds + Math.max(0, initialPositionSec),
              video.endSeconds,
            ),
            baseUrl: getApiOrigin(),
          }}
          style={styles.player}
          originWhitelist={['https://*', `${getApiOrigin()}/*`, 'about:blank']}
          onShouldStartLoadWithRequest={shouldLoadPlayerRequest}
          onMessage={handleMessage}
          onError={() => setHasError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 400) setHasError(true);
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          setSupportMultipleWindows={false}
          accessibilityLabel={title}
        />
      ) : null}
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
        {video ? (
          <Button title={openSourceLabel} variant="ghost" size="sm" onPress={openSource} />
        ) : null}
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
  player: {
    width: '100%',
    minWidth: 200,
    minHeight: 200,
    aspectRatio: 16 / 9,
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
}));
