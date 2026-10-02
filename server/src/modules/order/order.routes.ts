import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as orderController from './order.controller';
import { checkoutBody, enrollParams, listOrdersQuery } from './order.schema';

/** Gắn ở gốc `/` vì module có 2 nhóm đường dẫn: `/orders/*` và `/courses/:id/enroll`. */
export const router = Router();

router.post(
  '/orders/checkout',
  requireAuth,
  validate({ body: checkoutBody }),
  orderController.checkout,
);
router.get('/orders', requireAuth, validate({ query: listOrdersQuery }), orderController.list);
router.post(
  '/courses/:id/enroll',
  requireAuth,
  validate({ params: enrollParams }),
  orderController.enroll,
);
