import { Router } from 'express';

import * as healthController from './health.controller';

export const router = Router();

router.get('/', healthController.getHealth);
