import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as notificationController from './notification.controller';
import { listNotificationsQuery, notificationIdParams } from './notification.schema';

export const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: listNotificationsQuery }), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
// `read-all` có 1 đoạn đường dẫn, `:id/read` có 2 đoạn nên không bao giờ trùng nhau.
router.patch('/read-all', notificationController.markAllRead);
router.patch(
  '/:id/read',
  validate({ params: notificationIdParams }),
  notificationController.markRead,
);
