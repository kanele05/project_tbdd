import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as cartController from './cart.controller';
import { addCartItemBody, cartItemParams } from './cart.schema';

export const router = Router();

router.use(requireAuth);

router.get('/', cartController.get);
router.post('/items', validate({ body: addCartItemBody }), cartController.addItem);
router.delete('/items/:courseId', validate({ params: cartItemParams }), cartController.removeItem);
