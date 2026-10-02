import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const teacherIdParams = z.object({ id: z.string().trim().min(1).max(64) });

/** `GET /teachers` - hiện chỉ có `sort=top` (rating TB giảm dần, BR-11). */
export const listTeachersQuery = paginationQuery.extend({
  sort: z.enum(['top']).default('top'),
});

export type ListTeachersQuery = z.infer<typeof listTeachersQuery>;
