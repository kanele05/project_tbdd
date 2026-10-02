import { Router } from 'express';

import { optionalAuth } from '@/middlewares/requireAuth';

import * as homeController from './home.controller';

export const router = Router();

router.get('/', optionalAuth, homeController.get);
