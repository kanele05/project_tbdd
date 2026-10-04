/**
 * Hàm mật mã dùng cho xác thực (AUTH-01…AUTH-04), chỉ dựa vào `node:crypto`:
 *  - refresh token / mã khôi phục / OTP: sinh bằng CSPRNG, DB chỉ lưu hash;
 *  - secret TOTP: mã hóa AES-256-GCM bằng `TOTP_ENC_KEY`.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

import { env } from '@/config/env';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** So sánh hai chuỗi trong thời gian không phụ thuộc nội dung (chống timing attack). */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// ---------------------------------------------------------------- khóa

/**
 * Khóa AES-256 cho 2FA. Production bắt buộc có `TOTP_ENC_KEY` (config/env.ts kiểm tra khi khởi động);
 * dev/test không đặt thì suy ra từ JWT_SECRET để chạy local không cần cấu hình thêm.
 */
function totpKey(): Buffer {
  if (env.TOTP_ENC_KEY) return Buffer.from(env.TOTP_ENC_KEY, 'base64');
  if (env.NODE_ENV === 'production') throw new Error('TOTP_ENC_KEY is required in production');
  return createHash('sha256').update(`dev-totp-key:${env.JWT_SECRET}`).digest();
}

/** HMAC-SHA256 hex với khóa riêng theo `scope` (domain separation) suy ra từ `baseKey`. */
function scopedHmac(baseKey: Buffer | string, scope: string, value: string): string {
  const key = createHmac('sha256', baseKey).update(`scope:${scope}`).digest();
  return createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Hash mã OTP email (6 số chỉ có 10^6 khả năng nên SHA-256 trần dễ bị dò ngược) -> HMAC có khóa bí mật của server.
 * Khóa suy ra từ JWT_SECRET: đổi JWT_SECRET chỉ làm mã OTP đang chờ (sống tối đa 10 phút) mất hiệu lực.
 */
export function hashOtp(userId: string, purpose: string, code: string): string {
  return scopedHmac(env.JWT_SECRET, 'otp', `${purpose}:${userId}:${code}`);
}

/** Hash mã khôi phục 2FA, khóa theo TOTP_ENC_KEY (bền vững như secret 2FA, không phụ thuộc JWT_SECRET). */
export function hashRecoveryCode(userId: string, normalizedCode: string): string {
  return scopedHmac(totpKey(), 'recovery', `${userId}:${normalizedCode}`);
}

// ---------------------------------------------------------------- sinh chuỗi ngẫu nhiên

/** OTP 6 số, có thể bắt đầu bằng 0 (`000123`). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Refresh token: 32 byte ngẫu nhiên (256 bit) dạng base64url. Entropy cao nên chỉ cần SHA-256, không cần bcrypt. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return sha256Hex(token);
}

/** Bảng chữ cái 32 ký tự, bỏ I/O/0/1 để khó đọc nhầm. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_LENGTH = 10;

/** Mã khôi phục dạng `XXXXX-XXXXX` (50 bit entropy). */
export function generateRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < RECOVERY_LENGTH; i += 1) {
    code += RECOVERY_ALPHABET[randomInt(0, RECOVERY_ALPHABET.length)];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** Bỏ khoảng trắng/gạch ngang, viết hoa; trả `null` nếu không đúng định dạng mã khôi phục. */
export function normalizeRecoveryCode(input: string): string | null {
  const normalized = input.toUpperCase().replace(/[\s-]/g, '');
  if (normalized.length !== RECOVERY_LENGTH) return null;
  for (const ch of normalized) if (!RECOVERY_ALPHABET.includes(ch)) return null;
  return normalized;
}

// ---------------------------------------------------------------- AES-256-GCM

const CIPHER_VERSION = 'v1';

/** Mã hóa -> `v1.<iv>.<authTag>.<ciphertext>` (base64url). IV mới (96 bit) cho mỗi lần mã hóa. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', totpKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/** Giải mã; ném lỗi nếu sai khóa / dữ liệu bị sửa (GCM xác thực toàn vẹn). */
export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext, ...rest] = payload.split('.');
  if (version !== CIPHER_VERSION || !iv || !tag || ciphertext === undefined || rest.length > 0) {
    throw new Error('Invalid encrypted secret format');
  }
  const decipher = createDecipheriv('aes-256-gcm', totpKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
