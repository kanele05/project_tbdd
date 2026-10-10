import type { TurnstileWidgetProps } from './turnstile';

export type RecaptchaTheme = 'light' | 'dark';
export type RecaptchaSize = 'normal' | 'compact';
export type RecaptchaLanguage = 'en' | 'vi';

export type RecaptchaMessage =
  | { type: 'ready' }
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'error' }
  | { type: 'resize'; height: number };

export type RecaptchaWidgetProps = TurnstileWidgetProps;

export const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';

function toScriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function getRecaptchaSize(availableWidth: number): RecaptchaSize {
  return availableWidth >= 304 ? 'normal' : 'compact';
}

export function isValidRecaptchaBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

export function isAllowedRecaptchaUrl(value: string, baseUrl: string): boolean {
  if (value === 'about:blank') return true;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    const baseHostname = new URL(baseUrl).hostname.toLowerCase();
    return (
      hostname === baseHostname ||
      ['google.com', 'gstatic.com', 'recaptcha.net'].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
    );
  } catch {
    return false;
  }
}

/** The page we load ourselves (`about:blank` or the configured base origin). */
export function isRecaptchaPageUrl(value: string, baseUrl: string): boolean {
  if (value === 'about:blank') return true;
  try {
    return new URL(value).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

export function isRecaptchaMessageFromBaseUrl(value: string, baseUrl: string): boolean {
  try {
    const messageUrl = new URL(value);
    const expectedUrl = new URL(baseUrl);
    return messageUrl.protocol === 'https:' && messageUrl.origin === expectedUrl.origin;
  } catch {
    return false;
  }
}

export function buildRecaptchaHtml({
  siteKey,
  theme,
  size,
  language,
}: {
  siteKey: string;
  theme: RecaptchaTheme;
  size: RecaptchaSize;
  language: RecaptchaLanguage;
}): string {
  const scriptUrl = `${RECAPTCHA_SCRIPT_URL}?onload=onRecaptchaV2Loaded&render=explicit&hl=${encodeURIComponent(
    language,
  )}`;
  const initialHeight = size === 'normal' ? 78 : 144;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; min-width: 304px; background: transparent; }
  body { display: flex; justify-content: center; align-items: flex-start; overflow-x: hidden; overflow-y: auto; }
  #captcha { width: 304px; min-height: ${initialHeight}px; }
</style>
<script>
  function post(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function reportHeight() {
    var bottom = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, ${initialHeight});
    Array.prototype.forEach.call(document.querySelectorAll('iframe'), function (frame) {
      var rect = frame.getBoundingClientRect();
      var fixed = window.getComputedStyle(frame).position === 'fixed';
      bottom = Math.max(bottom, rect.bottom + (fixed ? 0 : window.scrollY));
    });
    post({ type: 'resize', height: Math.ceil(bottom + 8) });
  }
  function observeCaptchaSize() {
    var scheduledFrame = 0;
    var observer = new MutationObserver(function () {
      if (scheduledFrame) return;
      scheduledFrame = window.requestAnimationFrame(function () {
        scheduledFrame = 0;
        reportHeight();
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    window.addEventListener('resize', reportHeight);
    reportHeight();
  }
  function onRecaptchaV2Loaded() {
    try {
      grecaptcha.render('captcha', {
        sitekey: ${toScriptString(siteKey)},
        theme: ${toScriptString(theme)},
        size: ${toScriptString(size)},
        callback: function (token) { post({ type: 'token', token: token }); },
        'expired-callback': function () { post({ type: 'expired' }); },
        'error-callback': function () { post({ type: 'error' }); }
      });
      post({ type: 'ready' });
      observeCaptchaSize();
    } catch (error) {
      post({ type: 'error' });
    }
  }
</script>
<script src="${scriptUrl}" async defer onerror="post({ type: 'error' })"></script>
</head>
<body><div id="captcha"></div></body>
</html>`;
}

export function parseRecaptchaMessage(data: string): RecaptchaMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const message = parsed as { type?: unknown; token?: unknown; height?: unknown };
  switch (message.type) {
    case 'ready':
      return { type: 'ready' };
    case 'token':
      return typeof message.token === 'string' && message.token.length > 0
        ? { type: 'token', token: message.token }
        : null;
    case 'expired':
      return { type: 'expired' };
    case 'error':
      return { type: 'error' };
    case 'resize':
      return typeof message.height === 'number' &&
        Number.isFinite(message.height) &&
        message.height > 0
        ? { type: 'resize', height: message.height }
        : null;
    default:
      return null;
  }
}
