import type { AiCourseDraftDto } from '@/types/api';

import { STUDIO_LIMITS } from './limits';

export type AiOutline = AiCourseDraftDto['sections'];

/** The outline without blank titles (a section or lesson the teacher emptied is dropped). */
export function cleanOutline(sections: AiOutline): AiOutline {
  return sections
    .map((section) => ({
      title: section.title.trim().slice(0, STUDIO_LIMITS.sectionTitleMax),
      lessons: section.lessons
        .map((lesson) => ({
          ...lesson,
          title: lesson.title.trim().slice(0, STUDIO_LIMITS.lessonTitleMax),
        }))
        .filter((lesson) => lesson.title.length > 0),
    }))
    .filter((section) => section.title.length > 0)
    .slice(0, STUDIO_LIMITS.maxSections);
}

export function setSectionTitle(sections: AiOutline, index: number, title: string): AiOutline {
  return sections.map((section, i) => (i === index ? { ...section, title } : section));
}

export function removeSection(sections: AiOutline, index: number): AiOutline {
  return sections.filter((_, i) => i !== index);
}

export function setLessonTitle(
  sections: AiOutline,
  sectionIndex: number,
  lessonIndex: number,
  title: string,
): AiOutline {
  return sections.map((section, i) =>
    i === sectionIndex
      ? {
          ...section,
          lessons: section.lessons.map((lesson, j) =>
            j === lessonIndex ? { ...lesson, title } : lesson,
          ),
        }
      : section,
  );
}

export function removeLesson(
  sections: AiOutline,
  sectionIndex: number,
  lessonIndex: number,
): AiOutline {
  return sections.map((section, i) =>
    i === sectionIndex
      ? { ...section, lessons: section.lessons.filter((_, j) => j !== lessonIndex) }
      : section,
  );
}
