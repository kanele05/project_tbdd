import { z } from 'zod';

const idParam = z.string().trim().min(1).max(100);

export const courseIdParams = z.object({ id: idParam });
export const lessonIdParams = z.object({ id: idParam });

/**
 * `PUT /lessons/:id/progress`. `positionSec` có thể là số thực (currentTime của player) -> service làm tròn
 * và kẹp trong [0, durationSec] (BR-03), nên số âm / quá lớn KHÔNG bị từ chối.
 */
export const saveProgressBody = z.object({
  positionSec: z.number({ error: 'positionSec must be a number' }),
  isCompleted: z.boolean({ error: 'isCompleted must be a boolean' }).optional(),
});

export type CourseIdParams = z.infer<typeof courseIdParams>;
export type LessonIdParams = z.infer<typeof lessonIdParams>;
export type SaveProgressBody = z.infer<typeof saveProgressBody>;
