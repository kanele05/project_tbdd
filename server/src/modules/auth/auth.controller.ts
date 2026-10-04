import type { Request, Response } from 'express';

import { verifyToken } from '@/lib/jwt';
import { created, noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  TwoFactorLoginInput,
  VerifyEmailInput,
} from './auth.schema';
import * as authService from './auth.service';
import { getClientContext } from './clientContext';
import * as passwordService from './password.service';
import * as sessionService from './session.service';

/** Lấy token Bearer dạng thô (không kiểm hạn) - logout vẫn chạy khi access token đã hết hạn. */
function bearerSessionId(req: Request): string | undefined {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return verifyToken(token)?.sessionId;
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterInput;
  created(res, await authService.register(body, getClientContext(req, body.lang)));
}

export async function login(req: Request, res: Response): Promise<void> {
  ok(res, await authService.login(req.body as LoginInput, getClientContext(req)));
}

export async function verifyTwoFactor(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await authService.verifyTwoFactorLogin(req.body as TwoFactorLoginInput, getClientContext(req)),
  );
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  ok(res, await authService.verifyEmail(req.body as VerifyEmailInput, getClientContext(req)));
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const body = req.body as ResendVerificationInput;
  ok(res, await authService.resendVerification(body, getClientContext(req, body.lang)));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as ForgotPasswordInput;
  ok(res, await passwordService.forgotPassword(body, getClientContext(req, body.lang)));
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await passwordService.resetPassword(req.body as ResetPasswordInput, getClientContext(req));
  noContent(res);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;
  ok(res, await sessionService.refreshSession(refreshToken, getClientContext(req)));
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as LogoutInput;
  await sessionService.logout(
    { sessionId: bearerSessionId(req), refreshToken },
    getClientContext(req),
  );
  noContent(res);
}

export async function me(req: Request, res: Response): Promise<void> {
  ok(res, await authService.getMe(getAuthUser(req).id));
}
