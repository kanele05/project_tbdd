/**
 * `CourseRevision.payload` (BR-21): bản sửa đổi chứa các trường "lớn" của khóa đã xuất bản.
 * Trường "nhỏ" (phụ đề, mô tả, lợi ích, mô tả project, ảnh bìa) áp dụng thẳng lên khóa nên KHÔNG nằm ở đây.
 * Schema dùng chung: studio (PUT/POST revision) và admin (duyệt, diff). Lưu nháp yêu cầu cấu trúc đúng, link YouTube
 * hợp lệ và thời lượng 1 giây-6 giờ; phần còn lại của BR-20 (số bài, bài xem thử, giá...) chỉ kiểm tra lúc gửi duyệt
 * (`getCourseMissing`).
 */
import { z } from 'zod';

import { COURSE_LIMITS as L, type CourseSnapshot } from '@/lib/courseChecklist';

const lessonSchema = z
  .object({
    /** Có = bài đã tồn tại (giữ id, cập nhật, giữ tiến độ học viên); không có = bài mới. */
    id: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(L.lessonTitleMax),
    /**
     * Link YouTube (service chuẩn hóa trước khi lưu) hoặc video đang lưu của bài giữ nguyên id (vd MP4 mẫu
     * của khóa seed). Quy tắc này do service kiểm khi lưu + checklist BR-20 khi gửi duyệt, không đặt ở
     * schema để payload cũ của khóa seed vẫn đọc được ở màn admin/AI.
     */
    videoUrl: z.string().trim().min(1).max(500),
    durationSec: z.number().int().min(L.lessonMinSec).max(L.lessonMaxSec),
    isPreview: z.boolean(),
    content: z.string().max(L.lessonContentMax).default(''),
  })
  .strict();

const sectionSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(L.sectionTitleMax),
    lessons: z.array(lessonSchema).max(L.maxLessons),
  })
  .strict();

export const courseRevisionPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(L.titleMax),
    priceCents: z.number().int().min(0).max(L.priceMaxCents),
    originalPriceCents: z.number().int().min(0).max(L.priceMaxCents).nullable(),
    categoryId: z.string().min(1),
    tagIds: z.array(z.string().min(1)).max(L.maxTags),
    sections: z.array(sectionSchema).max(L.maxSections),
  })
  .strict()
  .refine((payload) => payload.sections.flatMap((s) => s.lessons).length <= L.maxLessons, {
    message: `At most ${L.maxLessons} lessons per course`,
    path: ['sections'],
  });

export type CourseRevisionPayload = z.infer<typeof courseRevisionPayloadSchema>;

/** Trường "nhỏ" của khóa cần để ghép với payload khi kiểm tra checklist của bản sửa đổi. */
export type CourseMinorFields = { description: string; thumbnailUrl: string };

/** Khóa sau khi áp dụng bản sửa đổi = trường nhỏ hiện tại của khóa + payload. */
export function snapshotFromRevision(
  minor: CourseMinorFields,
  payload: CourseRevisionPayload,
  /** Video đang lưu của khóa (`storedVideoUrls`) - bài giữ nguyên link thì không bắt buộc YouTube. */
  stored?: ReadonlyMap<string, string>,
): CourseSnapshot {
  return {
    title: payload.title,
    description: minor.description,
    thumbnailUrl: minor.thumbnailUrl,
    categoryId: payload.categoryId,
    priceCents: payload.priceCents,
    originalPriceCents: payload.originalPriceCents,
    sections: payload.sections.map((section) => ({
      lessons: section.lessons.map((lesson) => ({
        ...(lesson.id ? { id: lesson.id } : {}),
        videoUrl: lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        isStoredVideo: lesson.id !== undefined && stored?.get(lesson.id) === lesson.videoUrl,
      })),
    })),
  };
}
