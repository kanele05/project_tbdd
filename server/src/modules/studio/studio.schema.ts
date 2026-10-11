// Schema zod cho body/query/params của Studio (dùng qua validate()). Giới hạn lấy từ COURSE_LIMITS.
import { z } from 'zod';

import { COURSE_LIMITS as L } from '@/lib/courseChecklist';
import { courseRevisionPayloadSchema } from '@/lib/courseRevisionPayload';
import { paginationQuery } from '@/lib/pagination';
import { normalizeYouTubeUrl } from '@/lib/youtube';

import { isOwnUploadUrl } from './studioUrl';

export const COURSE_STATUS_VALUES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;

export const idParams = z.object({ id: z.string().min(1) });

export const listCoursesQuery = paginationQuery.extend({
  status: z.enum(COURSE_STATUS_VALUES).optional(),
});
export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;

const infoShape = {
  title: z.string().trim().min(L.titleMin).max(L.titleMax),
  subtitle: z.string().trim().max(L.subtitleMax).nullable(),
  description: z.string().trim().max(L.descriptionMax),
  categoryId: z.string().min(1),
  tagIds: z
    .array(z.string().min(1))
    .max(L.maxTags)
    .refine((ids) => new Set(ids).size === ids.length, 'Tags must be unique'),
  priceCents: z.number().int().min(0).max(L.priceMaxCents),
  originalPriceCents: z.number().int().min(0).max(L.priceMaxCents).nullable(),
  benefits: z.array(z.string().trim().min(1).max(L.benefitMax)).max(L.maxBenefits),
  projectDescription: z.string().trim().max(L.projectDescriptionMax).nullable(),
  // Sửa khóa: service chỉ kiểm tra khi ảnh thật sự đổi (gửi lại ảnh cũ, kể cả ảnh ngoài của khóa seed, vẫn hợp lệ).
  thumbnailUrl: z.string().trim().max(2048),
};

const newThumbnailUrl = z
  .string()
  .trim()
  .refine(isOwnUploadUrl, 'Must be the url returned by POST /teacher/uploads/image');

export const createCourseBody = z.object(infoShape).partial().extend({
  title: infoShape.title,
  categoryId: infoShape.categoryId,
  thumbnailUrl: newThumbnailUrl.optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseBody>;

export const updateCourseBody = z
  .object(infoShape)
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateCourseInput = z.infer<typeof updateCourseBody>;

export const sectionBody = z.object({ title: z.string().trim().min(1).max(L.sectionTitleMax) });
export type SectionInput = z.infer<typeof sectionBody>;

const lessonShape = {
  title: z.string().trim().min(1).max(L.lessonTitleMax),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((url) => normalizeYouTubeUrl(url) !== null, 'Must be a valid YouTube link'),
  durationSec: z.number().int().min(L.lessonMinSec).max(L.lessonMaxSec),
  isPreview: z.boolean(),
  content: z.string().max(L.lessonContentMax),
};

export const createLessonBody = z.object(lessonShape).partial().extend({
  title: lessonShape.title,
  videoUrl: lessonShape.videoUrl,
  durationSec: lessonShape.durationSec,
  isPreview: lessonShape.isPreview,
});
export type CreateLessonInput = z.infer<typeof createLessonBody>;

export const updateLessonBody = z
  .object(lessonShape)
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateLessonInput = z.infer<typeof updateLessonBody>;

const idList = z
  .array(z.string().min(1))
  .max(L.maxLessons)
  .refine((ids) => new Set(ids).size === ids.length, 'ids must be unique');

export const reorderBody = z.discriminatedUnion('target', [
  z.object({ target: z.literal('sections'), ids: idList }),
  z.object({ target: z.literal('lessons'), sectionId: z.string().min(1), ids: idList }),
]);
export type ReorderInput = z.infer<typeof reorderBody>;

export const revisionBody = courseRevisionPayloadSchema;
export type CourseRevisionBody = z.infer<typeof revisionBody>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === null || value === '' ? null : value));

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const profileShape = {
  jobTitle: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(2000),
  organization: optionalText(100),
  location: optionalText(100),
  timezone: optionalText(100).refine(
    (value) => value === null || isValidTimeZone(value),
    'Must be a valid IANA time zone',
  ),
};

export const teacherProfileBody = z
  .object(profileShape)
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });
export type TeacherProfileBody = z.infer<typeof teacherProfileBody>;
