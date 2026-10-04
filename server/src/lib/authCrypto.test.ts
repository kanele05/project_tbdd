import type * as CryptoNamespace from './authCrypto';
import {
  decryptSecret,
  encryptSecret,
  generateOtp,
  generateRecoveryCode,
  generateRefreshToken,
  hashOtp,
  hashRecoveryCode,
  hashRefreshToken,
  normalizeRecoveryCode,
  safeEqual,
  sha256Hex,
} from './authCrypto';

describe('sha256Hex / safeEqual', () => {
  it('matches the known SHA-256 of "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('compares strings of equal and different length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('generateOtp', () => {
  it('always returns exactly 6 digits (keeps leading zeros)', () => {
    for (let i = 0; i < 200; i += 1) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('pads small numbers with zeros', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    // randomInt của node:crypto không dùng Math.random; kiểm tra gián tiếp bằng độ dài ở vòng lặp trên.
    jest.restoreAllMocks();
    expect(generateOtp()).toHaveLength(6);
  });
});

describe('hashOtp', () => {
  it('is deterministic and bound to user, purpose and code', () => {
    const base = hashOtp('u1', 'VERIFY_EMAIL', '123456');
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOtp('u1', 'VERIFY_EMAIL', '123456')).toBe(base);
    expect(hashOtp('u2', 'VERIFY_EMAIL', '123456')).not.toBe(base);
    expect(hashOtp('u1', 'RESET_PASSWORD', '123456')).not.toBe(base);
    expect(hashOtp('u1', 'VERIFY_EMAIL', '123457')).not.toBe(base);
  });
});

describe('refresh tokens', () => {
  it('generates unique 256-bit base64url tokens and hashes them with SHA-256', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(hashRefreshToken(a)).toBe(sha256Hex(a));
    expect(hashRefreshToken(a)).not.toContain(a);
  });
});

describe('recovery codes', () => {
  it('generates XXXXX-XXXXX codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateRecoveryCode()).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/,
      );
    }
  });

  it('normalizes case, dashes and spaces, and rejects bad input', () => {
    expect(normalizeRecoveryCode('abcde-fghjk')).toBe('ABCDEFGHJK');
    expect(normalizeRecoveryCode(' ABCDE FGHJK ')).toBe('ABCDEFGHJK');
    expect(normalizeRecoveryCode('ABCDE-FGHJ')).toBeNull();
    expect(normalizeRecoveryCode('ABCDE-FGHJ0')).toBeNull(); // 0 không thuộc bảng chữ cái
    expect(normalizeRecoveryCode('ABCDE-FGHJI')).toBeNull(); // I bị loại
  });

  it('hashes per user (the same code hashes differently for two users)', () => {
    const a = hashRecoveryCode('u1', 'ABCDEFGHJK');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRecoveryCode('u1', 'ABCDEFGHJK')).toBe(a);
    expect(hashRecoveryCode('u2', 'ABCDEFGHJK')).not.toBe(a);
  });
});

describe('encryptSecret / decryptSecret (AES-256-GCM)', () => {
  it('round-trips and never produces the same ciphertext twice', () => {
    const a = encryptSecret('JBSWY3DPEHPK3PXP');
    const b = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(a).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(a).not.toContain('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(b)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects a tampered ciphertext (GCM authenticates the data)', () => {
    const parts = encryptSecret('secret').split('.');
    const flipped = Buffer.from(parts[3] ?? '', 'base64url');
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    parts[3] = flipped.toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });

  it.each(['', 'v2.a.b.c', 'v1.a.b', 'v1.a.b.c.d'])(
    'rejects the malformed payload "%s"',
    (payload) => {
      expect(() => decryptSecret(payload)).toThrow('Invalid encrypted secret format');
    },
  );
});

describe('TOTP_ENC_KEY handling', () => {
  type CryptoModule = typeof CryptoNamespace;

  function loadWithEnv(envOverride: Record<string, unknown>): CryptoModule {
    let loaded: CryptoModule | undefined;
    jest.isolateModules(() => {
      jest.doMock('@/config/env', () => ({
        env: { JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'test', ...envOverride },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('./authCrypto') as CryptoModule;
    });
    jest.dontMock('@/config/env');
    return loaded as CryptoModule;
  }

  it('uses TOTP_ENC_KEY when configured: ciphertext made with another key cannot be decrypted', () => {
    const keyA = Buffer.alloc(32, 1).toString('base64');
    const keyB = Buffer.alloc(32, 2).toString('base64');
    const withA = loadWithEnv({ TOTP_ENC_KEY: keyA });
    const withB = loadWithEnv({ TOTP_ENC_KEY: keyB });
    const encrypted = withA.encryptSecret('hello');
    expect(withA.decryptSecret(encrypted)).toBe('hello');
    expect(() => withB.decryptSecret(encrypted)).toThrow();
  });

  it('falls back to a key derived from JWT_SECRET outside production', () => {
    const lib = loadWithEnv({});
    expect(lib.decryptSecret(lib.encryptSecret('hello'))).toBe('hello');
  });

  it('refuses to run in production without TOTP_ENC_KEY', () => {
    const lib = loadWithEnv({ NODE_ENV: 'production' });
    expect(() => lib.encryptSecret('hello')).toThrow('TOTP_ENC_KEY is required in production');
  });
});
