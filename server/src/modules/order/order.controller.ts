import type { Request, Response } from 'express';

import type { PaginationQuery } from '@/lib/pagination';
import { created, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { CheckoutInput } from './order.schema';
import * as orderService from './order.service';

export async function checkout(req: Request, res: Response): Promise<void> {
  const result = await orderService.checkout(getAuthUser(req).id, req.body as CheckoutInput);
  created(res, result);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { orders, meta } = await orderService.listOrders(
    getAuthUser(req).id,
    req.query as unknown as PaginationQuery,
  );
  ok(res, orders, meta);
}

export async function enroll(req: Request, res: Response): Promise<void> {
  created(res, await orderService.enrollInFreeCourse(getAuthUser(req).id, String(req.params.id)));
}
