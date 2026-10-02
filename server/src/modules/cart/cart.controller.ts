import type { Request, Response } from 'express';

import { created, noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { AddCartItemInput } from './cart.schema';
import * as cartService from './cart.service';

export async function get(req: Request, res: Response): Promise<void> {
  ok(res, await cartService.getCart(getAuthUser(req).id));
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const { courseId } = req.body as AddCartItemInput;
  created(res, await cartService.addToCart(getAuthUser(req).id, courseId));
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  await cartService.removeFromCart(getAuthUser(req).id, String(req.params.courseId));
  noContent(res);
}
