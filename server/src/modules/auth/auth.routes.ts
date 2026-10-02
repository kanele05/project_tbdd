import { Router } from 'express';

import { authRateLimiter } from '@/middlewares/rateLimit';
import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as authController from './auth.controller';
import { loginBody, registerBody } from './auth.schema';

export const router = Router();

// NFR-05: 10 request/phút/IP, chỉ cho login + register (KHÔNG áp cho GET /me).
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerBody }),
  authController.register,
);
router.post('/login', authRateLimiter, validate({ body: loginBody }), authController.login);
router.get('/me', requireAuth, authController.me);
