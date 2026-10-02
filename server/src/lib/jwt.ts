import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';
import type { AuthUser } from '@/types/auth';

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Trả về `null` nếu token sai chữ ký / hết hạn / payload không hợp lệ. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    const role = payload.role;
    if (role !== 'STUDENT' && role !== 'TEACHER' && role !== 'ADMIN') return null;
    return { id: payload.sub, role };
  } catch {
    return null;
  }
}
