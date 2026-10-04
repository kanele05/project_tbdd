import {
  base32Decode,
  base32Encode,
  buildOtpauthUrl,
  generateTotpSecret,
  hotp,
  totp,
  totpStep,
  verifyTotp,
} from './totp';

/** Secret ASCII "12345678901234567890" dùng trong test vector của RFC 4226 / RFC 6238 (SHA-1). */
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32 (RFC 4648 §10 test vectors)', () => {
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes "%s" as %s (no padding) and decodes it back', (plain, encoded) => {
    expect(base32Encode(Buffer.from(plain))).toBe(encoded);
    expect(base32Decode(encoded).toString()).toBe(plain);
  });

  it('decodes lowercase, spaces and = padding', () => {
    expect(base32Decode('mzxw 6ytb oi======').toString()).toBe('foobar');
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('MZXW1')).toThrow('Invalid base32 character');
  });

  it('encodes the RFC secret to the known base32 string', () => {
    expect(base32Encode(RFC_SECRET)).toBe(RFC_SECRET_BASE32);
  });
});

describe('hotp (RFC 4226 Appendix D)', () => {
  const expected = [
    '755224',
    '287082',
    '359152',
    '969429',
    '338314',
    '254676',
    '287922',
    '162583',
    '399871',
    '520489',
  ];
  it.each(expected.map((code, counter) => [counter, code] as const))(
    'counter %i -> %s',
    (counter, code) => {
      expect(hotp(RFC_SECRET, counter)).toBe(code);
    },
  );
});

describe('totp (RFC 6238 Appendix B, SHA-1, 8 digits)', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('T = %i s -> %s', (seconds, code) => {
    expect(totp(RFC_SECRET, seconds * 1000, { digits: 8 })).toBe(code);
  });

  it('produces the 6-digit code used by authenticator apps (the low 6 digits of the 8-digit value)', () => {
    expect(totp(RFC_SECRET, 59_000)).toBe('287082');
    expect(totp(RFC_SECRET, 1111111109 * 1000)).toBe('081804');
  });

  it('uses 30 second steps', () => {
    expect(totpStep(59_000)).toBe(1);
    expect(totpStep(60_000)).toBe(2);
    expect(totpStep(0)).toBe(0);
  });
});

describe('verifyTotp', () => {
  const now = 1111111109 * 1000; // bước 37037036, mã 081804
  const step = totpStep(now);

  it('accepts the code of the current step and returns that step', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '081804', { nowMs: now })).toBe(step);
  });

  it('accepts one step of clock drift in either direction but not two', () => {
    const prev = hotp(RFC_SECRET, step - 1);
    const next = hotp(RFC_SECRET, step + 1);
    const farPast = hotp(RFC_SECRET, step - 2);
    const farFuture = hotp(RFC_SECRET, step + 2);
    expect(verifyTotp(RFC_SECRET_BASE32, prev, { nowMs: now })).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET_BASE32, next, { nowMs: now })).toBe(step + 1);
    expect(verifyTotp(RFC_SECRET_BASE32, farPast, { nowMs: now })).toBeNull();
    expect(verifyTotp(RFC_SECRET_BASE32, farFuture, { nowMs: now })).toBeNull();
  });

  it('rejects a wrong code', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '000000', { nowMs: now })).toBeNull();
  });

  it('rejects replaying a code whose step is not newer than lastStep', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '081804', { nowMs: now, lastStep: step })).toBeNull();
    expect(verifyTotp(RFC_SECRET_BASE32, '081804', { nowMs: now, lastStep: step + 1 })).toBeNull();
    expect(verifyTotp(RFC_SECRET_BASE32, '081804', { nowMs: now, lastStep: step - 1 })).toBe(step);
  });

  it.each(['12345', '1234567', 'abcdef', '', '12 456'])(
    'rejects the malformed code "%s"',
    (code) => {
      expect(verifyTotp(RFC_SECRET_BASE32, code, { nowMs: now })).toBeNull();
    },
  );

  it('never matches negative steps near the epoch', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, hotp(RFC_SECRET, 0), { nowMs: 0, window: 1 })).toBe(0);
  });

  it('defaults to the current time', () => {
    const code = totp(base32Decode(RFC_SECRET_BASE32), Date.now());
    expect(verifyTotp(RFC_SECRET_BASE32, code)).not.toBeNull();
  });
});

describe('generateTotpSecret / buildOtpauthUrl', () => {
  it('generates a 160-bit base32 secret (32 chars) that differs every time', () => {
    const a = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(a)).toHaveLength(20);
    expect(generateTotpSecret()).not.toBe(a);
  });

  it('builds a Key URI that authenticator apps understand', () => {
    const url = new URL(
      buildOtpauthUrl({ secret: 'ABCDEFGH', accountName: 'a+b@example.com', issuer: 'E-Learning' }),
    );
    expect(url.protocol).toBe('otpauth:');
    expect(url.host).toBe('totp');
    expect(decodeURIComponent(url.pathname)).toBe('/E-Learning:a+b@example.com');
    expect(url.searchParams.get('secret')).toBe('ABCDEFGH');
    expect(url.searchParams.get('issuer')).toBe('E-Learning');
    expect(url.searchParams.get('algorithm')).toBe('SHA1');
    expect(url.searchParams.get('digits')).toBe('6');
    expect(url.searchParams.get('period')).toBe('30');
  });
});
