import type { Request, Response } from 'express';

import { noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';
import { getClientContext } from '@/modules/auth/clientContext';
import * as passwordService from '@/modules/auth/password.service';
import * as sessionService from '@/modules/auth/session.service';
import * as twoFactorService from '@/modules/auth/twoFactor.service';

import type {
  ChangePasswordInput,
  DisableTwoFactorInput,
  EnableTwoFactorInput,
  RecoveryCodesInput,
  SessionParams,
} from './security.schema';

export async function overview(req: Request, res: Response): Promise<void> {
  ok(res, await twoFactorService.getSecurityOverview(getAuthUser(req).id));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  await passwordService.changePassword(
    user.id,
    user.sessionId,
    req.body as ChangePasswordInput,
    getClientContext(req),
  );
  noContent(res);
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  ok(res, await sessionService.listSessions(user.id, user.sessionId));
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  const { id } = req.params as SessionParams;
  await sessionService.revokeSessionOfUser(getAuthUser(req).id, id, getClientContext(req));
  noContent(res);
}

export async function revokeOtherSessions(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  const revokedCount = await sessionService.revokeUserSessions(user.id, {
    exceptSessionId: user.sessionId,
    reason: 'REMOTE_LOGOUT',
  });
  ok(res, { revokedCount });
}

export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  ok(res, await twoFactorService.setupTwoFactor(getAuthUser(req).id));
}

export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  const { code } = req.body as EnableTwoFactorInput;
  ok(res, await twoFactorService.enableTwoFactor(getAuthUser(req).id, code, getClientContext(req)));
}

export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  await twoFactorService.disableTwoFactor(
    getAuthUser(req).id,
    req.body as DisableTwoFactorInput,
    getClientContext(req),
  );
  noContent(res);
}

export async function regenerateRecoveryCodes(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await twoFactorService.regenerateRecoveryCodes(
      getAuthUser(req).id,
      req.body as RecoveryCodesInput,
      getClientContext(req),
    ),
  );
}
