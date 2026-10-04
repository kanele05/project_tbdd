import { signAccessToken } from '@/lib/jwt';
import type { AuthUser } from '@/types/auth';

type TokenUser = { id: string; role?: AuthUser['role'] };

/**
 * access token của "phiên test" mà `createUser()` tạo sẵn trong DB (requireAuth kiểm tra `sid` trong DB nên
 * token phải gắn với một Session thật). Khóa theo userId.
 */
const sessionTokens = new Map<string, string>();

export function registerTestToken(userId: string, token: string): void {
  sessionTokens.set(userId, token);
}

/**
 * JWT hợp lệ cho user do `createUser()` / `createTeacher()` tạo. User chưa có phiên (vd. `{ id: 'deleted-user-id' }`,
 * hoặc `createUser({ session: false })`) nhận token trỏ tới phiên không tồn tại -> mọi request trả 401.
 */
export function tokenFor(user: TokenUser): string {
  return (
    sessionTokens.get(user.id) ??
    signAccessToken({ id: user.id, role: user.role ?? 'STUDENT', sessionId: 'no-such-session' })
  );
}

/** Header cho Supertest: `api.get(url).set(authHeader(user))`. */
export function authHeader(user: TokenUser): { Authorization: string } {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}
