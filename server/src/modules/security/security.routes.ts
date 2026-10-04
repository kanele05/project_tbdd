import { Router } from 'express';

import { sensitiveRateLimiter } from '@/middlewares/rateLimit';
import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as securityController from './security.controller';
import {
  changePasswordBody,
  disableTwoFactorBody,
  enableTwoFactorBody,
  recoveryCodesBody,
  sessionParams,
} from './security.schema';

/**
 * Bảo mật tài khoản (AUTH-01, AUTH-03, AUTH-04), gắn ở `/me`: `/me/security`, `/me/password`,
 * `/me/sessions`, `/me/2fa/*`. Mọi route cần đăng nhập (gắn `requireAuth` từng route, KHÔNG dùng
 * `router.use` để không chặn nhầm các đường dẫn `/me/...` của module khác).
 */
export const router = Router();

router.get('/security', requireAuth, securityController.overview);
router.post(
  '/password',
  requireAuth,
  sensitiveRateLimiter,
  validate({ body: changePasswordBody }),
  securityController.changePassword,
);

router.get('/sessions', requireAuth, securityController.listSessions);
// Đăng xuất mọi thiết bị khác (giữ phiên hiện tại).
router.delete(
  '/sessions',
  requireAuth,
  sensitiveRateLimiter,
  securityController.revokeOtherSessions,
);
router.delete(
  '/sessions/:id',
  requireAuth,
  sensitiveRateLimiter,
  validate({ params: sessionParams }),
  securityController.revokeSession,
);

router.post('/2fa/setup', requireAuth, sensitiveRateLimiter, securityController.setupTwoFactor);
router.post(
  '/2fa/enable',
  requireAuth,
  sensitiveRateLimiter,
  validate({ body: enableTwoFactorBody }),
  securityController.enableTwoFactor,
);
router.post(
  '/2fa/disable',
  requireAuth,
  sensitiveRateLimiter,
  validate({ body: disableTwoFactorBody }),
  securityController.disableTwoFactor,
);
router.post(
  '/2fa/recovery-codes',
  requireAuth,
  sensitiveRateLimiter,
  validate({ body: recoveryCodesBody }),
  securityController.regenerateRecoveryCodes,
);
