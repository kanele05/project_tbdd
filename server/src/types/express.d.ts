import type { AuthUser } from '@/types/auth';

declare global {
  namespace Express {
    interface Request {
      /** Được gán bởi `requireAuth` / `optionalAuth`. */
      user?: AuthUser;
    }
  }
}

export {};
