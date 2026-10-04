/**
 * TOTP (RFC 6238) trên HOTP (RFC 4226), tự hiện thực bằng `node:crypto` (HMAC-SHA1, 6 số, bước 30 s) -
 * tương thích Google Authenticator / Authy. Test bằng test vector trong chính các RFC (totp.test.ts).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const TOTP_PERIOD_SEC = 30;
export const TOTP_DIGITS = 6;
/** Chấp nhận lệch ±1 bước (±30 s) do đồng hồ điện thoại không khớp. */
export const TOTP_WINDOW = 1;

// ---------------------------------------------------------------- base32 (RFC 4648)

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** Bỏ qua khoảng trắng, dấu `=` và chữ hoa/thường; ký tự lạ -> ném lỗi. */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const index = BASE32_ALPHABET.indexOf(ch);
    if (index === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secret mới 160 bit (RFC 4226 khuyến nghị) dạng base32 (32 ký tự). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

// ---------------------------------------------------------------- HOTP / TOTP

/** HOTP (RFC 4226 §5.3): HMAC-SHA1(secret, counter 8 byte big-endian) -> cắt động -> lấy `digits` chữ số. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(message).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** Bước thời gian T = floor(unix / period). */
export function totpStep(nowMs: number, periodSec = TOTP_PERIOD_SEC): number {
  return Math.floor(nowMs / 1000 / periodSec);
}

export function totp(
  secret: Buffer,
  nowMs: number,
  options: { digits?: number; periodSec?: number } = {},
): string {
  const { digits = TOTP_DIGITS, periodSec = TOTP_PERIOD_SEC } = options;
  return hotp(secret, totpStep(nowMs, periodSec), digits);
}

function codesEqual(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export type VerifyTotpOptions = {
  nowMs?: number;
  /** Số bước lệch cho phép mỗi phía (mặc định 1). */
  window?: number;
  /** Bước của mã đã dùng gần nhất: mã thuộc bước ≤ giá trị này bị coi là dùng lại và bị từ chối. */
  lastStep?: number | null;
};

/**
 * Kiểm tra mã TOTP. Trả về **bước thời gian khớp** (lưu lại làm `lastStep` để chống dùng lại cùng mã) hoặc `null`.
 * Luôn duyệt hết các bước trong cửa sổ để thời gian xử lý không lộ việc khớp ở bước nào.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  options: VerifyTotpOptions = {},
): number | null {
  const { nowMs = Date.now(), window = TOTP_WINDOW, lastStep = null } = options;
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const current = totpStep(nowMs);
  let matched: number | null = null;
  for (let step = current - window; step <= current + window; step += 1) {
    if (step >= 0 && codesEqual(hotp(secret, step), code) && matched === null) matched = step;
  }
  if (matched === null) return null;
  if (lastStep !== null && matched <= lastStep) return null;
  return matched;
}

/** URI cho mã QR (Key URI Format của Google Authenticator). */
export function buildOtpauthUrl(params: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.accountName)}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SEC),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
