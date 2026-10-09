import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TURNSTILE_SITE_KEY } from '@/constants/config';
import { useTheme } from '@/theme';

import { CaptchaFrame, CaptchaGate, type CaptchaStatus } from './CaptchaFrame';
import { TURNSTILE_SCRIPT_URL, type TurnstileTheme, type TurnstileWidgetProps } from './turnstile';

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: TurnstileTheme;
      size: 'flexible';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'timeout-callback': () => void;
      'error-callback': (code?: unknown) => boolean;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoaded?: () => void;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Load Cloudflare's script once per page; a failed load can be retried. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${TURNSTILE_SCRIPT_URL}?render=explicit&onload=onTurnstileLoaded`;
    script.async = true;
    script.defer = true;
    window.onTurnstileLoaded = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile unavailable'));
    };
    script.onerror = () => {
      script.remove();
      scriptPromise = null;
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * CAPTCHA (Cloudflare Turnstile) on the web: loads Cloudflare's script and renders the official
 * widget straight into a DOM node. The site key must list this site's hostname.
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const { isDark } = useTheme();
  return <TurnstileChallenge key={`${props.resetKey ?? 0}-${isDark}`} {...props} />;
}

function TurnstileChallenge({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const { isDark } = useTheme();
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<View>(null);
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onToken, onExpire, onError });
  useEffect(() => {
    callbacks.current = { onToken, onExpire, onError };
  });

  useEffect(() => {
    if (!hasStarted) return;
    let isCancelled = false;
    let widgetId: string | null = null;
    const fail = () => {
      if (isCancelled) return;
      setStatus('error');
      callbacks.current.onExpire?.();
      callbacks.current.onError?.();
    };
    const expire = () => {
      if (isCancelled) return;
      setHasStarted(false);
      callbacks.current.onExpire?.();
    };

    loadTurnstile()
      .then((turnstile) => {
        // On the web a `View` ref is the underlying DOM element.
        const container = containerRef.current as unknown as HTMLElement | null;
        if (isCancelled || !container) return;
        widgetId = turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: isDark ? 'dark' : 'light',
          size: 'flexible',
          callback: (token) => {
            if (!isCancelled) callbacks.current.onToken(token);
          },
          'expired-callback': expire,
          'timeout-callback': expire,
          'error-callback': () => {
            fail();
            return true;
          },
        });
        setStatus('ready');
      })
      .catch(fail);

    return () => {
      isCancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [attempt, hasStarted, isDark]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  if (!hasStarted) return <CaptchaGate onVerify={() => setHasStarted(true)} />;

  return (
    <CaptchaFrame status={status} onRetry={retry}>
      <View ref={containerRef} style={styles.container} testID="turnstile-container" />
    </CaptchaFrame>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', minHeight: 65 },
});
