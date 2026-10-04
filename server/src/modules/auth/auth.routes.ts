import { Router } from 'express';

import {
  authRateLimiter,
  emailRateLimiter,
  otpRateLimiter,
  refreshRateLimiter,
} from '@/middlewares/rateLimit';
import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as authController from './auth.controller';
import {
  forgotPasswordBody,
  loginBody,
  logoutBody,
  refreshBody,
  registerBody,
  resendVerificationBody,
  resetPasswordBody,
  twoFactorLoginBody,
  verifyEmailBody,
} from './auth.schema';

export const router = Router();

// NFR-05: 10 request/phút/IP cho login + register (KHÔNG áp cho GET /me). Các endpoint nhạy cảm khác có
// giới hạn riêng (rateLimit.ts); tất cả tắt khi NODE_ENV=test.
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerBody }),
  authController.register,
);
router.post('/login', authRateLimiter, validate({ body: loginBody }), authController.login);
router.post(
  '/2fa/verify',
  otpRateLimiter,
  validate({ body: twoFactorLoginBody }),
  authController.verifyTwoFactor,
);
router.post(
  '/verify-email',
  otpRateLimiter,
  validate({ body: verifyEmailBody }),
  authController.verifyEmail,
);
router.post(
  '/resend-verification',
  emailRateLimiter,
  validate({ body: resendVerificationBody }),
  authController.resendVerification,
);
router.post(
  '/forgot-password',
  emailRateLimiter,
  validate({ body: forgotPasswordBody }),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  otpRateLimiter,
  validate({ body: resetPasswordBody }),
  authController.resetPassword,
);
router.post(
  '/refresh',
  refreshRateLimiter,
  validate({ body: refreshBody }),
  authController.refresh,
);
// Không dùng requireAuth: access token đã hết hạn vẫn đăng xuất được (bằng refreshToken trong body).
router.post('/logout', validate({ body: logoutBody }), authController.logout);
router.get('/me', requireAuth, authController.me);
