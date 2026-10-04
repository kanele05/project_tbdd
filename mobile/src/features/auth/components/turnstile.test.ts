import { buildTurnstileHtml, parseTurnstileMessage } from './turnstile';

describe('buildTurnstileHtml', () => {
  it('embeds the site key, the theme and the official script', () => {
    const html = buildTurnstileHtml({ siteKey: '1x00000000000000000000AA', theme: 'dark' });

    expect(html).toContain('"1x00000000000000000000AA"');
    expect(html).toContain('"dark"');
    expect(html).toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain('ReactNativeWebView.postMessage');
  });

  it('cannot be broken out of by a hostile site key', () => {
    const html = buildTurnstileHtml({
      siteKey: '</script><script>alert(1)</script>',
      theme: 'light',
    });

    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});

describe('parseTurnstileMessage', () => {
  it('reads the four message types', () => {
    expect(parseTurnstileMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseTurnstileMessage('{"type":"token","token":"abc"}')).toEqual({
      type: 'token',
      token: 'abc',
    });
    expect(parseTurnstileMessage('{"type":"expired"}')).toEqual({ type: 'expired' });
    expect(parseTurnstileMessage('{"type":"error","code":"110200"}')).toEqual({
      type: 'error',
      code: '110200',
    });
  });

  it('ignores anything else', () => {
    expect(parseTurnstileMessage('not json')).toBeNull();
    expect(parseTurnstileMessage('"text"')).toBeNull();
    expect(parseTurnstileMessage('{"type":"token"}')).toBeNull();
    expect(parseTurnstileMessage('{"type":"token","token":""}')).toBeNull();
    expect(parseTurnstileMessage('{"type":"other"}')).toBeNull();
  });
});
