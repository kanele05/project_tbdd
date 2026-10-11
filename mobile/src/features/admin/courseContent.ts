import type { AdminCourseDetailDto, CourseRevisionPayload, StudioSectionDto } from '@/types/api';

export type PreviewLesson = {
  key: string;
  title: string;
  durationSec: number;
  videoUrl: string;
  isPreview: boolean;
  /** Text notes of the lesson ("" when none). */
  content: string;
};

export type PreviewSection = { key: string; title: string; lessons: PreviewLesson[] };

/** Sections of the live course, in teaching order. */
export function sectionsFromCourse(sections: readonly StudioSectionDto[]): PreviewSection[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      key: section.id,
      title: section.title,
      lessons: [...section.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson) => ({
          key: lesson.id,
          title: lesson.title,
          durationSec: lesson.durationSec,
          videoUrl: lesson.videoUrl,
          isPreview: lesson.isPreview,
          content: lesson.content,
        })),
    }));
}

/** Sections proposed by a revision (lessons without an id are new, so keys fall back to the position). */
export function sectionsFromRevision(payload: CourseRevisionPayload): PreviewSection[] {
  return payload.sections.map((section, sectionIndex) => ({
    key: section.id ?? `new-section-${sectionIndex}`,
    title: section.title,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      key: lesson.id ?? `new-lesson-${sectionIndex}-${lessonIndex}`,
      title: lesson.title,
      durationSec: lesson.durationSec,
      videoUrl: lesson.videoUrl,
      isPreview: lesson.isPreview,
      content: lesson.content,
    })),
  }));
}

/** The curriculum the admin is being asked to approve: the revision's when that is what is pending. */
export function getReviewedSections(detail: AdminCourseDetailDto): PreviewSection[] {
  if (detail.reviewTarget === 'REVISION' && detail.revision) {
    return sectionsFromRevision(detail.revision.payload);
  }
  return sectionsFromCourse(detail.sections);
}

export function countLessons(sections: readonly PreviewSection[]): number {
  return sections.reduce((sum, section) => sum + section.lessons.length, 0);
}
