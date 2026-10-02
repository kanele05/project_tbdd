import { z } from 'zod';

export const courseIdParams = z.object({ id: z.string().trim().min(1).max(100) });

export type CourseIdParams = z.infer<typeof courseIdParams>;
