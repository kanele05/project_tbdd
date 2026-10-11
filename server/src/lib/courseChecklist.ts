/**
 * Checklist gửi duyệt khóa học (BR-20) + giới hạn nhập liệu khi soạn khóa (BR-19…BR-21).
 * Hàm thuần, dùng chung cho: teacher submit / revision submit (module studio), hiển thị `missing[]` ở
 * chi tiết khóa (studio, admin) và kiểm tra lại lúc admin duyệt.
 */
import { normalizeYouTubeUrl } from '@/lib/youtube';

export const COURSE_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  subtitleMax: 200,
  descriptionMin: 100,
  descriptionMax: 5000,
  benefitMax: 200,
  maxBenefits: 10,
  projectDescriptionMax: 2000,
  maxTags: 5,
  sectionTitleMax: 120,
  lessonTitleMax: 160,
  lessonContentMax: 3000,
  maxSections: 20,
  maxLessons: 100,
  minLessons: 3,
  minPreviewLessons: 1,
  maxPreviewLessons: 3,
  lessonMinSec: 1,
  lessonMaxSec: 6 * 60 * 60,
  /** Giá: 0 (miễn phí) hoặc từ 99 cent tới 99 999 cent. */
  priceMinCents: 99,
  priceMaxCents: 99_999,
  rejectReasonMin: 5,
  rejectReasonMax: 500,
} as const;

/** Mã mục thiếu trong `details.missing[]` của 422 `COURSE_INCOMPLETE`. */
export type CourseMissingCode =
  | 'TITLE_LENGTH'
  | 'DESCRIPTION_TOO_SHORT'
  | 'NO_THUMBNAIL'
  | 'NO_CATEGORY'
  | 'NO_SECTION'
  | 'NOT_ENOUGH_LESSONS'
  | 'LESSON_VIDEO_INVALID'
  | 'LESSON_DURATION_INVALID'
  | 'PREVIEW_COUNT'
  | 'PRICE_INVALID'
  | 'ORIGINAL_PRICE_INVALID';

export type CourseMissingItem = {
  code: CourseMissingCode;
  /** Có với `LESSON_VIDEO_INVALID`, `LESSON_DURATION_INVALID` khi bài đã có id (bài mới trong bản sửa đổi thì không). */
  lessonId?: string;
  /** Thứ tự (bắt đầu từ 1) của bài trong toàn khóa - để hiển thị khi bài chưa có id. */
  lessonNumber?: number;
};

/** Ảnh chụp nội dung khóa dùng để kiểm tra (từ DB hoặc từ bản sửa đổi ghép với trường nhỏ của khóa). */
export type CourseSnapshot = {
  title: string;
  description: string;
  thumbnailUrl: string;
  categoryId: string | null;
  priceCents: number;
  originalPriceCents: number | null;
  sections: ReadonlyArray<{
    lessons: ReadonlyArray<{
      id?: string;
      videoUrl: string;
      durationSec: number;
      isPreview: boolean;
      /**
       * Bài giữ nguyên video đang lưu trong DB (vd MP4 mẫu của khóa seed): chấp nhận dù không phải
       * YouTube, để bản sửa đổi của khóa cũ gửi duyệt được. Bài mới hoặc đổi link vẫn phải là YouTube.
       */
      isStoredVideo?: boolean;
    }>;
  }>;
};

/** `lessonId -> videoUrl` đang lưu của khóa, để đánh dấu `isStoredVideo` khi kiểm tra bản sửa đổi. */
export function storedVideoUrls(
  sections: ReadonlyArray<{ lessons: ReadonlyArray<{ id: string; videoUrl: string }> }>,
): ReadonlyMap<string, string> {
  return new Map(
    sections.flatMap((section) => section.lessons.map((lesson) => [lesson.id, lesson.videoUrl])),
  );
}

/** Trả danh sách mục còn thiếu theo BR-20; mảng rỗng = đủ điều kiện gửi duyệt. */
export function getCourseMissing(course: CourseSnapshot): CourseMissingItem[] {
  const missing: CourseMissingItem[] = [];
  const L = COURSE_LIMITS;

  const title = course.title.trim();
  if (title.length < L.titleMin || title.length > L.titleMax)
    missing.push({ code: 'TITLE_LENGTH' });
  if (course.description.trim().length < L.descriptionMin) {
    missing.push({ code: 'DESCRIPTION_TOO_SHORT' });
  }
  if (course.thumbnailUrl.trim() === '') missing.push({ code: 'NO_THUMBNAIL' });
  if (!course.categoryId) missing.push({ code: 'NO_CATEGORY' });

  if (course.sections.length === 0) missing.push({ code: 'NO_SECTION' });
  const lessons = course.sections.flatMap((section) => section.lessons);
  if (lessons.length < L.minLessons) missing.push({ code: 'NOT_ENOUGH_LESSONS' });

  lessons.forEach((lesson, index) => {
    const ref = {
      ...(lesson.id ? { lessonId: lesson.id } : {}),
      lessonNumber: index + 1,
    };
    if (!lesson.isStoredVideo && normalizeYouTubeUrl(lesson.videoUrl) === null) {
      missing.push({ code: 'LESSON_VIDEO_INVALID', ...ref });
    }
    if (
      !Number.isInteger(lesson.durationSec) ||
      lesson.durationSec < L.lessonMinSec ||
      lesson.durationSec > L.lessonMaxSec
    ) {
      missing.push({ code: 'LESSON_DURATION_INVALID', ...ref });
    }
  });

  const previews = lessons.filter((lesson) => lesson.isPreview).length;
  if (previews < L.minPreviewLessons || previews > L.maxPreviewLessons) {
    missing.push({ code: 'PREVIEW_COUNT' });
  }

  const isFree = course.priceCents === 0;
  const isPaidInRange =
    Number.isInteger(course.priceCents) &&
    course.priceCents >= L.priceMinCents &&
    course.priceCents <= L.priceMaxCents;
  if (!isFree && !isPaidInRange) missing.push({ code: 'PRICE_INVALID' });
  if (course.originalPriceCents !== null && course.originalPriceCents <= course.priceCents) {
    missing.push({ code: 'ORIGINAL_PRICE_INVALID' });
  }
  return missing;
}
