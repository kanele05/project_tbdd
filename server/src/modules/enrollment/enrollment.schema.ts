import { z } from 'zod';

/** BR-05: `all` (mặc định) | `ongoing` (% < 100) | `completed` (% = 100). */
export const myCoursesQuery = z.object({
  status: z.enum(['all', 'ongoing', 'completed']).default('all'),
});

export type MyCoursesQuery = z.infer<typeof myCoursesQuery>;
export type MyCoursesStatus = MyCoursesQuery['status'];
