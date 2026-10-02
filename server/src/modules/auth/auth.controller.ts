import type { Request, Response } from 'express';

import { created, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { LoginInput, RegisterInput } from './auth.schema';
import * as authService from './auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterInput);
  created(res, result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  ok(res, result);
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(getAuthUser(req).id);
  ok(res, user);
}
