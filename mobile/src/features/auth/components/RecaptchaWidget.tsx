import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText } from '@/components/ui/AppText';
import { RECAPTCHA_BASE_URL, RECAPTCHA_SITE_KEY } from '@/constants/config';
import { getCurrentLanguage, useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

import { CaptchaFrame, type CaptchaStatus } from './CaptchaFrame';
import {
  buildRecaptchaHtml,
  getRecaptchaSize,
  isAllowedRecaptchaUrl,
  isRecaptchaMessageFromBaseUrl,
  isRecaptchaPageUrl,
  isValidRecaptchaBaseUrl,
  parseRecaptchaMessage,
  type RecaptchaWidgetProps,
} from './recaptcha';

/**
 * Sub-frames (the Google challenge iframes) may load Google hosts. A top-level navigation away from
 * our own page (the "Privacy - Terms" links) would replace the checkbox, so it is cancelled and
 * opened in the system browser instead.
 */
function shouldLoadRequest(request: { url: string; isTopFrame?: boolean }): boolean {
  if (!isAllowedRecaptchaUrl(request.url, RECAPTCHA_BASE_URL)) return false;
  if (request.isTopFrame === true && !isRecaptchaPageUrl(request.url, RECAPTCHA_BASE_URL)) {
    void Linking.openURL(request.url).catch(() => undefined);
    return false;
  }
  return true;
}

export function RecaptchaWidget(props: RecaptchaWidgetProps) {
  const { isDark } = useTheme();
  const { i18n } = useTranslation('auth');
  const { width } = useWindowDimensions();
  const language = i18n.language;
  const size = getRecaptchaSize(Math.max(0, Math.min(width, 520) - 80));
  return (
    <RecaptchaChallenge key={`${props.resetKey ?? 0}-${isDark}-${language}-${size}`} {...props} />
  );
}

function RecaptchaChallenge({ onToken, onExpire, onError }: RecaptchaWidgetProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('auth');
  const { width, height: windowHeight } = useWindowDimensions();
  const size = getRecaptchaSize(Math.max(0, Math.min(width, 520) - 80));
  const widgetHeight = size === 'normal' ? 78 : 144;
  const maxHeight = Math.max(widgetHeight, Math.min(640, windowHeight - 48));
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(0);
  const [measuredLayout, setMeasuredLayout] = useState<{
    size: typeof size;
    height: number;
    isScrollable: boolean;
  } | null>(null);
  const callbacks = useRef({ onToken, onExpire, onError });
  const isActive = useRef(true);
  const hasConfiguration =
    Boolean(RECAPTCHA_SITE_KEY) && isValidRecaptchaBaseUrl(RECAPTCHA_BASE_URL);
  const language = getCurrentLanguage();
  const currentLayout = measuredLayout?.size === size ? measuredLayout : null;
  const height = currentLayout?.height ?? widgetHeight;
  const isScrollable = currentLayout?.isScrollable ?? false;

  useEffect(() => {
    callbacks.current = { onToken, onExpire, onError };
  });

  useEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
      callbacks.current.onExpire?.();
    };
  }, []);

  useEffect(() => {
    if (hasConfiguration) return;
    callbacks.current.onError?.();
  }, [hasConfiguration]);

  const html = useMemo(
    () =>
      buildRecaptchaHtml({
        siteKey: RECAPTCHA_SITE_KEY,
        theme: isDark ? 'dark' : 'light',
        size,
        language,
      }),
    [isDark, language, size],
  );

  const fail = useCallback(() => {
    if (!isActive.current) return;
    setStatus('error');
    callbacks.current.onExpire?.();
    callbacks.current.onError?.();
  }, []);

  useEffect(() => {
    if (!hasConfiguration || status !== 'loading') return;
    const timeout = setTimeout(fail, 20_000);
    return () => clearTimeout(timeout);
  }, [attempt, fail, hasConfiguration, status]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (
        !isActive.current ||
        attemptRef.current !== attempt ||
        !isRecaptchaMessageFromBaseUrl(event.nativeEvent.url, RECAPTCHA_BASE_URL)
      )
        return;
      const message = parseRecaptchaMessage(event.nativeEvent.data);
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
          callbacks.current.onExpire?.();
          break;
        case 'error':
          fail();
          break;
        case 'resize': {
          const nextHeight = Math.max(widgetHeight, Math.min(maxHeight, message.height));
          setMeasuredLayout({
            size,
            height: nextHeight,
            isScrollable: message.height > maxHeight,
          });
          break;
        }
      }
    },
    [attempt, fail, maxHeight, size, widgetHeight],
  );

  const retry = useCallback(() => {
    attemptRef.current += 1;
    setMeasuredLayout(null);
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  if (!hasConfiguration) {
    return (
      <AppText
        variant="body"
        color="dangerText"
        align="center"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        {t('captcha.configurationError')}
      </AppText>
    );
  }

  return (
    <CaptchaFrame status={status} onRetry={retry}>
      <WebView
        key={attempt}
        source={{ html, baseUrl: RECAPTCHA_BASE_URL }}
        originWhitelist={['https://*', 'about:blank']}
        onMessage={handleMessage}
        onError={fail}
        onHttpError={fail}
        onShouldStartLoadWithRequest={shouldLoadRequest}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        scrollEnabled={isScrollable}
        bounces
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        style={[styles.webview, { height }]}
        accessibilityLabel={t('captcha.label')}
        testID="recaptcha-webview"
      />
    </CaptchaFrame>
  );
}

const styles = StyleSheet.create({
  webview: { width: 304, backgroundColor: 'transparent' },
});
