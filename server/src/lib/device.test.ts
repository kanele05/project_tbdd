import { describeDevice, maskIp, truncateUserAgent } from './device';

describe('maskIp', () => {
  it.each([
    ['113.161.45.77', '113.161.45.x'],
    ['::ffff:10.1.2.3', '10.1.2.x'],
    ['2001:db8:85a3:8d3:1319:8a2e:370:7344', '2001:db8:85a3::x'],
    ['::1', '::1'],
    ['::ffff:127.0.0.1', '127.0.0.x'],
  ])('masks %s as %s', (ip, masked) => {
    expect(maskIp(ip)).toBe(masked);
  });

  it.each([null, undefined, '', 'not-an-ip'])('returns null for %p', (ip) => {
    expect(maskIp(ip)).toBeNull();
  });
});

describe('truncateUserAgent', () => {
  it('keeps at most 255 characters and passes null through', () => {
    expect(truncateUserAgent('a'.repeat(400))).toHaveLength(255);
    expect(truncateUserAgent('Mozilla')).toBe('Mozilla');
    expect(truncateUserAgent(null)).toBeNull();
    expect(truncateUserAgent(undefined)).toBeNull();
  });
});

describe('describeDevice', () => {
  const chromeWindows =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const edgeWindows = `${chromeWindows} Edg/126.0.0.0`;
  const firefoxLinux = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';
  const safariIphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const safariMac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const chromeAndroid =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

  it.each([
    [chromeWindows, 'Chrome on Windows'],
    [edgeWindows, 'Edge on Windows'],
    [firefoxLinux, 'Firefox on Linux'],
    [safariIphone, 'Safari on iOS'],
    [safariMac, 'Safari on macOS'],
    [chromeAndroid, 'Chrome on Android'],
    ['okhttp/4.12.0', 'App'],
    ['MyApp/12 CFNetwork/1494 Darwin/23.4.0', 'App'],
    ['Opera/9.80 (Windows NT 6.1) Presto/2.12 OPR/12', 'Opera on Windows'],
    ['SomeUnknownBot/1.0', 'Unknown device'],
    ['Dalvik/2.1.0 (Linux; Android 13)', 'Android'],
  ])('describes the user agent %#', (userAgent, expected) => {
    expect(describeDevice(userAgent)).toBe(expected);
  });

  it('prefers the name sent by the app (trimmed, at most 80 characters)', () => {
    expect(describeDevice(chromeWindows, '  Pixel 7 - Expo Go ')).toBe('Pixel 7 - Expo Go');
    expect(describeDevice(null, 'x'.repeat(200))).toHaveLength(80);
  });

  it('falls back to "Unknown device" without any information', () => {
    expect(describeDevice(null)).toBe('Unknown device');
    expect(describeDevice(undefined, '   ')).toBe('Unknown device');
  });
});
