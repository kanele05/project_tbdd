/**
 * So sánh khóa đang xuất bản với bản sửa đổi (BR-21) - hàm thuần, không đụng DB.
 * Quy ước khớp: chương/bài trong payload CÓ `id` còn tồn tại trong khóa = "cũ" (cập nhật); không có `id`
 * (hoặc `id` không còn trong khóa) = mới; có trong khóa mà payload không nhắc tới = bị xóa.
 * `applyRevision` dùng cùng quy ước nên diff luôn phản ánh đúng điều sẽ xảy ra khi duyệt.
 */
import type { CourseRevisionPayload } from '@/lib/courseRevisionPayload';
import { normalizeYouTubeUrl } from '@/lib/youtube';
import type {
  AdminDiffLessonContentDto,
  AdminDiffLessonDto,
  AdminRevisionDiffDto,
  FieldChangeDto,
} from '@/types/teacherAdminDto';

export type LiveLesson = {
  id: string;
  title: string;
  videoUrl: string;
  durationSec: number;
  isPreview: boolean;
  content: string | null;
};
export type LiveSection = { id: string; title: string; lessons: LiveLesson[] };
export type TagRef = { id: string; name: string; isHot: boolean };
export type CategoryRef = { id: string; name: string };

export type LiveCourse = {
  title: string;
  priceCents: number;
  originalPriceCents: number | null;
  category: CategoryRef;
  tags: TagRef[];
  sections: LiveSection[];
};

export type RevisionDiffInput = {
  live: LiveCourse;
  payload: CourseRevisionPayload;
  /** Danh mục / tag mà payload trỏ tới (đã tra tên). */
  afterCategory: CategoryRef;
  afterTags: TagRef[];
  /** Số dòng LessonProgress theo `lessonId` (chỉ cần cho bài bị xóa). */
  progressCounts: ReadonlyMap<string, number>;
};

type CurriculumDiff = AdminRevisionDiffDto['curriculum'];
type ContentField = CurriculumDiff['lessonsChanged'][number]['changedFields'][number];

function change<T>(before: T, after: T): FieldChangeDto<T> | null {
  return before === after ? null : { before, after };
}

const sameVideo = (a: string, b: string): boolean =>
  (normalizeYouTubeUrl(a) ?? a) === (normalizeYouTubeUrl(b) ?? b);

function liveContent(lesson: LiveLesson): AdminDiffLessonContentDto {
  return {
    title: lesson.title,
    videoUrl: lesson.videoUrl,
    durationSec: lesson.durationSec,
    isPreview: lesson.isPreview,
    content: lesson.content ?? '',
  };
}

function changedFields(
  before: AdminDiffLessonContentDto,
  after: AdminDiffLessonContentDto,
): ContentField[] {
  const fields: ContentField[] = [];
  if (before.title !== after.title) fields.push('title');
  if (!sameVideo(before.videoUrl, after.videoUrl)) fields.push('videoUrl');
  if (before.durationSec !== after.durationSec) fields.push('durationSec');
  if (before.isPreview !== after.isPreview) fields.push('isPreview');
  if (before.content !== after.content) fields.push('content');
  return fields;
}

/** Id các bài hiện có mà bản sửa đổi sẽ xóa (để tra số LessonProgress sẽ mất). */
export function findRemovedLessonIds(
  liveSections: readonly LiveSection[],
  payload: CourseRevisionPayload,
): string[] {
  const kept = new Set(
    payload.sections.flatMap((section) => section.lessons.flatMap((l) => (l.id ? [l.id] : []))),
  );
  return liveSections.flatMap((s) => s.lessons.map((l) => l.id)).filter((id) => !kept.has(id));
}

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function sameTagSet(a: readonly TagRef[], b: readonly TagRef[]): boolean {
  const ids = new Set(a.map((tag) => tag.id));
  return a.length === b.length && b.every((tag) => ids.has(tag.id));
}

const byName = (a: TagRef, b: TagRef): number =>
  a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

function diffCurriculum(
  liveSections: readonly LiveSection[],
  payload: CourseRevisionPayload,
  progressCounts: ReadonlyMap<string, number>,
): CurriculumDiff {
  const liveSectionById = new Map(liveSections.map((s) => [s.id, s]));
  const liveLessonById = new Map<string, { lesson: LiveLesson; section: LiveSection }>();
  for (const section of liveSections) {
    for (const lesson of section.lessons) liveLessonById.set(lesson.id, { lesson, section });
  }

  const sectionsAdded: string[] = [];
  const sectionsRenamed: FieldChangeDto<string>[] = [];
  const lessonsAdded: AdminDiffLessonDto[] = [];
  const lessonsChanged: CurriculumDiff['lessonsChanged'] = [];
  const keptSectionIds: string[] = [];
  const keptLessonIds: string[] = [];
  let hasMovedLesson = false;

  for (const section of payload.sections) {
    const liveSection = section.id ? liveSectionById.get(section.id) : undefined;
    if (liveSection) {
      keptSectionIds.push(liveSection.id);
      if (liveSection.title !== section.title) {
        sectionsRenamed.push({ before: liveSection.title, after: section.title });
      }
    } else {
      sectionsAdded.push(section.title);
    }

    for (const lesson of section.lessons) {
      const existing = lesson.id ? liveLessonById.get(lesson.id) : undefined;
      if (!existing) {
        lessonsAdded.push({
          id: null,
          title: lesson.title,
          sectionTitle: section.title,
          durationSec: lesson.durationSec,
        });
        continue;
      }
      keptLessonIds.push(existing.lesson.id);
      if (!liveSection || existing.section.id !== liveSection.id) hasMovedLesson = true;
      const before = liveContent(existing.lesson);
      const after: AdminDiffLessonContentDto = {
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        content: lesson.content,
      };
      const fields = changedFields(before, after);
      if (fields.length > 0) {
        lessonsChanged.push({
          id: existing.lesson.id,
          sectionTitle: section.title,
          before,
          after,
          changedFields: fields,
        });
      }
    }
  }

  const keptSections = new Set(keptSectionIds);
  const keptLessons = new Set(keptLessonIds);
  const sectionsRemoved = liveSections.filter((s) => !keptSections.has(s.id)).map((s) => s.title);
  const lessonsRemoved = liveSections.flatMap((section) =>
    section.lessons
      .filter((lesson) => !keptLessons.has(lesson.id))
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        sectionTitle: section.title,
        durationSec: lesson.durationSec,
        progressCount: progressCounts.get(lesson.id) ?? 0,
      })),
  );

  // Thứ tự tương đối của những chương/bài được giữ lại (bỏ phần thêm/xóa) có đổi không.
  const liveSectionOrder = liveSections.map((s) => s.id).filter((id) => keptSections.has(id));
  const liveLessonOrder = liveSections
    .flatMap((s) => s.lessons.map((l) => l.id))
    .filter((id) => keptLessons.has(id));
  const isReordered =
    !sameIdList(liveSectionOrder, keptSectionIds) ||
    !sameIdList(liveLessonOrder, keptLessonIds) ||
    hasMovedLesson;

  return {
    sectionsAdded,
    sectionsRemoved,
    sectionsRenamed,
    lessonsAdded,
    lessonsRemoved,
    lessonsChanged,
    isReordered,
  };
}

export function computeRevisionDiff(input: RevisionDiffInput): AdminRevisionDiffDto {
  const { live, payload, afterCategory, afterTags } = input;
  const title = change(live.title, payload.title);
  const priceCents = change(live.priceCents, payload.priceCents);
  const originalPriceCents = change(live.originalPriceCents, payload.originalPriceCents);
  const category =
    live.category.id === afterCategory.id ? null : { before: live.category, after: afterCategory };
  const beforeTags = [...live.tags].sort(byName);
  const tags = sameTagSet(beforeTags, afterTags)
    ? null
    : { before: beforeTags, after: [...afterTags].sort(byName) };
  const curriculum = diffCurriculum(live.sections, payload, input.progressCounts);

  const hasChanges =
    title !== null ||
    priceCents !== null ||
    originalPriceCents !== null ||
    category !== null ||
    tags !== null ||
    curriculum.isReordered ||
    curriculum.sectionsAdded.length > 0 ||
    curriculum.sectionsRemoved.length > 0 ||
    curriculum.sectionsRenamed.length > 0 ||
    curriculum.lessonsAdded.length > 0 ||
    curriculum.lessonsRemoved.length > 0 ||
    curriculum.lessonsChanged.length > 0;

  return { hasChanges, title, priceCents, originalPriceCents, category, tags, curriculum };
}
