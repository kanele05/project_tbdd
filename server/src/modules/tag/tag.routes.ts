import { Router } from 'express';

import * as tagController from './tag.controller';

export const router = Router();

router.get('/hot', tagController.listHot);
