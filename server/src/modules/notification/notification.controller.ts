import type { Request, Response } from 'express';

import type { PaginationQuery } from '@/lib/pagination';
import { noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import * as notificationService from './notification.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { notifications, meta } = await notificationService.listNotifications(
    getAuthUser(req).id,
    req.query as unknown as PaginationQuery,
  );
  ok(res, notifications, meta);
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  ok(res, await notificationService.getUnreadCount(getAuthUser(req).id));
}

export async function markRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAsRead(getAuthUser(req).id, String(req.params.id));
  noContent(res);
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAllAsRead(getAuthUser(req).id);
  noContent(res);
}
