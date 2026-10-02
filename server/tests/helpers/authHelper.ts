import { signToken } from '@/lib/jwt';
import type { AuthUser } from '@/types/auth';

/** Sinh JWT hợp lệ cho một user (không cần gọi /auth/login). */
export function tokenFor(user: AuthUser | { id: string; role?: AuthUser['role'] }): string {
  return signToken({ id: user.id, role: user.role ?? 'STUDENT' });
}

/** Header cho Supertest: `api.get(url).set(authHeader(user))`. */
export function authHeader(user: AuthUser | { id: string; role?: AuthUser['role'] }): {
  Authorization: string;
} {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}
