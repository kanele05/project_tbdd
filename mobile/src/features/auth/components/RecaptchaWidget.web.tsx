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

type RecaptchaLoad = {
  language: string;
  promise: Promise<RecaptchaApi>;
  /** Aborts a pending load (timer, callback, script tag) and rejects its promise. */
  abort: () => void;
};

let currentLoad: RecaptchaLoad | null = null;
let loadedLanguage: string | null = null;
let nextScriptLoadId = 0;

/**
 * The widget language is fixed by the `hl` parameter of api.js, so a language change needs a fresh
 * script: drop our script tag, Google's helper scripts, the grecaptcha globals and the detached
 * challenge popups, then load api.js again with the new `hl`.
 */
function resetRecaptchaRuntime(): void {
  currentLoad?.abort();
  currentLoad = null;
  loadedLanguage = null;
  document
    .querySelectorAll('script[data-recaptcha-v2], script[src*="gstatic.com/recaptcha"]')
    .forEach((node) => node.remove());
  document
    .querySelectorAll('iframe[src*="recaptcha/api2/bframe"]')
    .forEach((frame) => frame.parentElement?.parentElement?.remove());
  const globals = window as unknown as Record<string, unknown>;
  globals.grecaptcha = undefined;
  globals.___grecaptcha_cfg = undefined;
}

function loadRecaptcha(language: string): Promise<RecaptchaApi> {
  if (window.grecaptcha && loadedLanguage === language) return Promise.resolve(window.grecaptcha);
  if (currentLoad?.language === language) return currentLoad.promise;
  if (currentLoad || window.grecaptcha) resetRecaptchaRuntime();

  let abort: () => void = () => undefined;
  const promise = new Promise<RecaptchaApi>((resolve, reject) => {
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
      if (currentLoad?.promise === promise) currentLoad = null;
      reject(error);
    };
    abort = () => finishWithError(new Error('reCAPTCHA load aborted'));
    callbackWindow[callbackName] = () => {
      if (!window.grecaptcha) {
        finishWithError(new Error('reCAPTCHA unavailable'));
        return;
      }
      if (isSettled) return;
      isSettled = true;
      cleanup();
      loadedLanguage = language;
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
  // Abandoned loads (language switched mid-flight) reject on purpose; nobody listens any more.
  promise.catch(() => undefined);
  currentLoad = { language, promise, abort: () => abort() };
  return promise;
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
