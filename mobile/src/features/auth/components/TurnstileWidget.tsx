import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { TURNSTILE_BASE_URL, TURNSTILE_SITE_KEY } from '@/constants/config';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

import { CaptchaFrame, CaptchaGate, type CaptchaStatus } from './CaptchaFrame';
import { buildTurnstileHtml, parseTurnstileMessage, type TurnstileWidgetProps } from './turnstile';

/** Hosts the page may load: the widget's own origin and Cloudflare (script + challenge frames). */
const ALLOWED_URL = /^(about:|https:\/\/([\w-]+\.)*cloudflare\.com(\/|$))/;

/**
 * CAPTCHA (Cloudflare Turnstile) on Android / iOS: a small WebView loads the official widget and
 * passes the token back with `postMessage`. `baseUrl` makes Turnstile see a real hostname (it has
 * to be one of the site key's domains, see `EXPO_PUBLIC_TURNSTILE_BASE_URL`).
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const { isDark } = useTheme();
  return <TurnstileChallenge key={`${props.resetKey ?? 0}-${isDark}`} {...props} />;
}

function TurnstileChallenge({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('auth');
  const [hasStarted, setHasStarted] = useState(false);
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onToken, onExpire, onError });
  useEffect(() => {
    callbacks.current = { onToken, onExpire, onError };
  });

  const html = useMemo(
    () => buildTurnstileHtml({ siteKey: TURNSTILE_SITE_KEY, theme: isDark ? 'dark' : 'light' }),
    [isDark],
  );

  const fail = useCallback(() => {
    setStatus('error');
    callbacks.current.onExpire?.();
    callbacks.current.onError?.();
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseTurnstileMessage(event.nativeEvent.data);
      if (!message) return;
      switch (message.type) {
        case 'ready':
          setStatus('ready');
          break;
        case 'token':
          setStatus('ready');
          callbacks.current.onToken(message.token);
          break;
        case 'expired':
          setHasStarted(false);
          callbacks.current.onExpire?.();
          break;
        case 'error':
          fail();
          break;
      }
    },
    [fail],
  );

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  if (!hasStarted) return <CaptchaGate onVerify={() => setHasStarted(true)} />;

  return (
    <CaptchaFrame status={status} onRetry={retry}>
      <WebView
        key={`${attempt}-${isDark ? 'dark' : 'light'}`}
        source={{ html, baseUrl: TURNSTILE_BASE_URL }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onError={fail}
        onHttpError={fail}
        onShouldStartLoadWithRequest={(request) =>
          request.url === TURNSTILE_BASE_URL ||
          request.url === `${TURNSTILE_BASE_URL}/` ||
          ALLOWED_URL.test(request.url)
        }
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={styles.webview}
        accessibilityLabel={t('captcha.label')}
        testID="turnstile-webview"
      />
    </CaptchaFrame>
  );
}

const styles = StyleSheet.create({
  webview: { width: '100%', height: 70, backgroundColor: 'transparent' },
});
