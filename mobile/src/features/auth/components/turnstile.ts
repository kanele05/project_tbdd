/** Props shared by the native (WebView) and web (script) CAPTCHA widgets. */
export type TurnstileWidgetProps = {
  /** A fresh single-use token: send it with the next request. */
  onToken: (token: string) => void;
  /** The token expired before it was used (~5 min): the widget re-runs, the form must wait for a new token. */
  onExpire?: () => void;
  /** The challenge could not run (offline, blocked script...). The widget shows its own retry button. */
  onError?: () => void;
  /** Change it to throw the current challenge away and start a new one (a token works only once). */
  resetKey?: number;
};

export type TurnstileTheme = 'light' | 'dark';

export type TurnstileMessage =
  | { type: 'ready' }
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'error'; code: string };

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/** Escape a value for a JS string literal inside an inline `<script>` (no `</script>` break-out). */
function toScriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/**
 * Page loaded by the native WebView: renders the Turnstile widget and reports back through
 * `ReactNativeWebView.postMessage` with JSON `{ type: 'ready' | 'token' | 'expired' | 'error' }`.
 */
export function buildTurnstileHtml({
  siteKey,
  theme,
}: {
  siteKey: string;
  theme: TurnstileTheme;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { display: flex; align-items: center; justify-content: center; min-height: 70px; }
</style>
<script>
  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function onTurnstileLoaded() {
    turnstile.render('#captcha', {
      sitekey: ${toScriptString(siteKey)},
      theme: ${toScriptString(theme)},
      size: 'flexible',
      callback: function (token) { post({ type: 'token', token: token }); },
      'expired-callback': function () { post({ type: 'expired' }); },
      'timeout-callback': function () { post({ type: 'expired' }); },
      'error-callback': function (code) { post({ type: 'error', code: String(code || '') }); return true; }
    });
    post({ type: 'ready' });
  }
</script>
<script src="${TURNSTILE_SCRIPT_URL}?render=explicit&onload=onTurnstileLoaded" async defer
  onerror="post({ type: 'error', code: 'script' })"></script>
</head>
<body><div id="captcha"></div></body>
</html>`;
}

/** Parse a message from the WebView page; anything unexpected is ignored (`null`). */
export function parseTurnstileMessage(data: string): TurnstileMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const message = parsed as { type?: unknown; token?: unknown; code?: unknown };
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
      return { type: 'error', code: typeof message.code === 'string' ? message.code : '' };
    default:
      return null;
  }
}
