// Schema zod cho body/query/params của /admin/* (dùng qua validate()).
import { z } from 'zod';

import { COURSE_LIMITS } from '@/lib/courseChecklist';
import { paginationQuery } from '@/lib/pagination';

const COURSE_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
const REVISION_STATUSES = ['OPEN', 'PENDING_REVIEW', 'REJECTED'] as const;
const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

export const idParams = z.object({ id: z.string().trim().min(1).max(64) });

const reasonText = z
  .string()
  .trim()
  .min(COURSE_LIMITS.rejectReasonMin)
  .max(COURSE_LIMITS.rejectReasonMax);

/** `GET /admin/courses`: `status` là CourseStatus (type=course) hoặc RevisionStatus (type=revision). */
export const listAdminCoursesQuery = paginationQuery
  .extend({
    type: z.enum(['course', 'revision']).default('course'),
    status: z.enum([...COURSE_STATUSES, ...REVISION_STATUSES]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === undefined) return;
    const allowed: readonly string[] =
      value.type === 'course' ? COURSE_STATUSES : REVISION_STATUSES;
    if (!allowed.includes(value.status)) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `status must be one of ${allowed.join(', ')} when type=${value.type}`,
      });
    }
  });
export type ListAdminCoursesQuery = z.infer<typeof listAdminCoursesQuery>;

export const rejectCourseBody = z.object({ reason: reasonText });

/** Body tùy chọn của archive/restore: thiếu body hoặc `{}` đều hợp lệ. */
export const moderationReasonBody = z
  .object({ reason: reasonText.optional() })
  .optional()
  .transform((value) => value ?? {});

export const listAdminUsersQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuery>;

export const disableUserBody = z.object({ reason: reasonText });
