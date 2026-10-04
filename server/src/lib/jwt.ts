import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';
import { durationToSeconds } from '@/lib/duration';
import type { AuthUser } from '@/types/auth';

/** Access token sống ngắn (mặc định 15 phút); đổi bằng `ACCESS_TOKEN_TTL`. */
export const ACCESS_TOKEN_TTL_SEC = durationToSeconds(env.ACCESS_TOKEN_TTL);
/** `challengeToken` của đăng nhập 2 bước: 5 phút, chỉ dùng được ở `POST /auth/2fa/verify`. */
export const CHALLENGE_TOKEN_TTL_SEC = 5 * 60;

// Phân biệt loại token bằng claim `typ` để challengeToken không bao giờ dùng được như access token.
const ACCESS_TYP = 'access';
const CHALLENGE_TYP = '2fa-challenge';

/** Access token: `sub` = userId, `sid` = id phiên (bị thu hồi phiên -> token này bị từ chối ở requireAuth). */
export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ role: user.role, sid: user.sessionId, typ: ACCESS_TYP }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

/** Trả về `null` nếu token sai chữ ký / hết hạn / không phải access token / thiếu `sid`. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    if (payload.typ !== ACCESS_TYP || typeof payload.sid !== 'string') return null;
    const role = payload.role;
    if (role !== 'STUDENT' && role !== 'TEACHER' && role !== 'ADMIN') return null;
    return { id: payload.sub, role, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export function signChallengeToken(userId: string): string {
  return jwt.sign({ typ: CHALLENGE_TYP }, env.JWT_SECRET, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn: CHALLENGE_TOKEN_TTL_SEC,
  });
}

/** Trả về userId nếu là challengeToken hợp lệ, ngược lại `null`. */
export function verifyChallengeToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    return payload.typ === CHALLENGE_TYP ? payload.sub : null;
  } catch {
    return null;
  }
}
