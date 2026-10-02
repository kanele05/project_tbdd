import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const listNotificationsQuery = paginationQuery;

export const notificationIdParams = z.object({ id: z.string().trim().min(1).max(64) });
