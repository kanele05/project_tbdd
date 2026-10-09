import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { RECAPTCHA_SITE_KEY } from '@/constants/config';
import { getCurrentLanguage, useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

import { CaptchaFrame, type CaptchaStatus } from './CaptchaFrame';
import { getRecaptchaSize, RECAPTCHA_SCRIPT_URL, type RecaptchaWidgetProps } from './recaptcha';

type RecaptchaApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: 'light' | 'dark';
      size: 'normal' | 'compact';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => number;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: RecaptchaApi;
  }
}

let scriptPromise: Promise<RecaptchaApi> | null = null;
let nextScriptLoadId = 0;

function loadRecaptcha(language: string): Promise<RecaptchaApi> {
  if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
  if (scriptPromise) return scriptPromise;
  const loadPromise = new Promise<RecaptchaApi>((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = `onRecaptchaV2Loaded${++nextScriptLoadId}`;
    const callbackWindow = window as unknown as Window & Record<string, unknown>;
    let isSettled = false;
    const timeout = setTimeout(
      () => finishWithError(new Error('reCAPTCHA script timed out')),
      15_000,
    );
    const cleanup = () => {
      clearTimeout(timeout);
      delete callbackWindow[callbackName];
      script.onerror = null;
    };
    const finishWithError = (error: Error) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      script.remove();
      if (scriptPromise === loadPromise) scriptPromise = null;
      reject(error);
    };
    callbackWindow[callbackName] = () => {
      if (!window.grecaptcha) {
        finishWithError(new Error('reCAPTCHA unavailable'));
        return;
      }
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(window.grecaptcha);
    };
    script.src = `${RECAPTCHA_SCRIPT_URL}?onload=${callbackName}&render=explicit&hl=${encodeURIComponent(
      language,
    )}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaV2 = 'true';
    script.onerror = () => finishWithError(new Error('reCAPTCHA script failed to load'));
    document.head.appendChild(script);
  });
  scriptPromise = loadPromise;
  return loadPromise;
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
  const { width } = useWindowDimensions();
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<View>(null);
  const widgetId = useRef<number | null>(null);
  const callbacks = useRef({ onToken, onExpire, onError });
  const isActive = useRef(true);
  const hasConfiguration = Boolean(RECAPTCHA_SITE_KEY);
  const language = getCurrentLanguage();
  const availableWidth = Math.max(0, Math.min(width, 520) - 80);
  const size = getRecaptchaSize(availableWidth);
  const widgetWidth = size === 'normal' ? 304 : 164;
  const widgetHeight = size === 'normal' ? 78 : 144;

  useEffect(() => {
    callbacks.current = { onToken, onExpire, onError };
  });

  useEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasConfiguration) return;
    callbacks.current.onError?.();
  }, [hasConfiguration]);

  useEffect(() => {
    if (!hasConfiguration) return;
    let isCancelled = false;
    const fail = () => {
      if (isCancelled) return;
      setStatus('error');
      callbacks.current.onExpire?.();
      callbacks.current.onError?.();
    };
    const expire = () => {
      if (isCancelled) return;
      callbacks.current.onExpire?.();
    };

    loadRecaptcha(language)
      .then((recaptcha) => {
        const container = containerRef.current as unknown as HTMLElement | null;
        if (isCancelled || !container) return;
        widgetId.current = recaptcha.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: isDark ? 'dark' : 'light',
          size,
          callback: (token) => {
            if (!isCancelled) callbacks.current.onToken(token);
          },
          'expired-callback': expire,
          'error-callback': fail,
        });
        setStatus('ready');
      })
      .catch(fail);

    return () => {
      isCancelled = true;
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
      widgetId.current = null;
      callbacks.current.onExpire?.();
    };
  }, [attempt, hasConfiguration, isDark, language, size]);

  const retry = useCallback(() => {
    if (widgetId.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId.current);
      setStatus('ready');
      return;
    }
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
      <View
        ref={containerRef}
        style={[styles.container, { width: widgetWidth, minHeight: widgetHeight }]}
        testID="recaptcha-container"
      />
    </CaptchaFrame>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center' },
});
