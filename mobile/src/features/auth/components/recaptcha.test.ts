import {
  buildRecaptchaHtml,
  getRecaptchaSize,
  isAllowedRecaptchaUrl,
  isRecaptchaMessageFromBaseUrl,
  isValidRecaptchaBaseUrl,
  parseRecaptchaMessage,
} from './recaptcha';

describe('reCAPTCHA configuration helpers', () => {
  it('uses compact checkbox dimensions below 304 points', () => {
    expect(getRecaptchaSize(303)).toBe('compact');
    expect(getRecaptchaSize(304)).toBe('normal');
  });

  it('requires a clean HTTPS origin for the native WebView base URL', () => {
    expect(isValidRecaptchaBaseUrl('https://learn.example.com')).toBe(true);
    expect(isValidRecaptchaBaseUrl('http://learn.example.com')).toBe(false);
    expect(isValidRecaptchaBaseUrl('https://learn.example.com/path')).toBe(false);
    expect(isValidRecaptchaBaseUrl('https://user:pass@learn.example.com')).toBe(false);
  });

  it('allows Google challenge hosts and the configured HTTPS host only', () => {
    expect(
      isAllowedRecaptchaUrl(
        'https://www.google.com/recaptcha/api2/anchor',
        'https://learn.example.com',
      ),
    ).toBe(true);
    expect(
      isAllowedRecaptchaUrl('https://www.gstatic.com/recaptcha/xyz', 'https://learn.example.com'),
    ).toBe(true);
    expect(isAllowedRecaptchaUrl('https://learn.example.com/', 'https://learn.example.com')).toBe(
      true,
    );
    expect(
      isAllowedRecaptchaUrl('https://google.com.evil.test/', 'https://learn.example.com'),
    ).toBe(false);
    expect(isAllowedRecaptchaUrl('https://evil.test/', 'https://learn.example.com')).toBe(false);
    expect(isAllowedRecaptchaUrl('http://www.google.com/', 'https://learn.example.com')).toBe(
      false,
    );
    expect(isAllowedRecaptchaUrl('about:blank', 'https://learn.example.com')).toBe(true);
  });

  it('accepts bridge messages only from the configured HTTPS page origin', () => {
    expect(
      isRecaptchaMessageFromBaseUrl('https://learn.example.com/', 'https://learn.example.com'),
    ).toBe(true);
    expect(
      isRecaptchaMessageFromBaseUrl(
        'https://www.google.com/recaptcha/',
        'https://learn.example.com',
      ),
    ).toBe(false);
    expect(
      isRecaptchaMessageFromBaseUrl('http://learn.example.com/', 'https://learn.example.com'),
    ).toBe(false);
  });
});

describe('buildRecaptchaHtml', () => {
  it('explicitly renders a visible checkbox with theme and language', () => {
    const html = buildRecaptchaHtml({
      siteKey: 'site-key',
      theme: 'dark',
      size: 'compact',
      language: 'vi',
    });

    expect(html).toContain(
      'https://www.google.com/recaptcha/api.js?onload=onRecaptchaV2Loaded&render=explicit&hl=vi',
    );
    expect(html).toContain('theme: "dark"');
    expect(html).toContain('size: "compact"');
    expect(html).toContain('grecaptcha.render');
    expect(html).toContain("'expired-callback'");
    expect(html).toContain("'error-callback'");
    expect(html).toContain('min-height: 144px');
    expect(html).toContain("type: 'resize'");
    expect(html).toContain('MutationObserver');
    expect(html).toContain('ReactNativeWebView.postMessage');
  });

  it('escapes hostile site keys before placing them in inline script', () => {
    const html = buildRecaptchaHtml({
      siteKey: '</script><script>alert(1)</script>',
      theme: 'light',
      size: 'normal',
      language: 'en',
    });

    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});

describe('parseRecaptchaMessage', () => {
  it('parses ready, token, expired, and error events', () => {
    expect(parseRecaptchaMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseRecaptchaMessage('{"type":"token","token":"token-1"}')).toEqual({
      type: 'token',
      token: 'token-1',
    });
    expect(parseRecaptchaMessage('{"type":"expired"}')).toEqual({ type: 'expired' });
    expect(parseRecaptchaMessage('{"type":"error"}')).toEqual({ type: 'error' });
    expect(parseRecaptchaMessage('{"type":"resize","height":420}')).toEqual({
      type: 'resize',
      height: 420,
    });
  });

  it('ignores malformed and empty token events', () => {
    expect(parseRecaptchaMessage('not json')).toBeNull();
    expect(parseRecaptchaMessage('{"type":"token","token":""}')).toBeNull();
    expect(parseRecaptchaMessage('{"type":"resize","height":"420"}')).toBeNull();
    expect(parseRecaptchaMessage('{"type":"resize","height":0}')).toBeNull();
    expect(parseRecaptchaMessage('{"type":"other"}')).toBeNull();
  });
});
