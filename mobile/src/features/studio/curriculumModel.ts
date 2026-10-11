import type {
  CourseRevisionInput,
  CourseRevisionPayload,
  StudioLessonDto,
  StudioSectionDto,
} from '@/types/api';

/** A lesson as the editor holds it. `id` is missing while it only exists in a revision draft. */
export type EditableLesson = {
  /** React key: the server id, or `new-N` for a lesson that is not saved yet. */
  key: string;
  id?: string;
  title: string;
  videoUrl: string;
  durationSec: number;
  isPreview: boolean;
  content: string;
};

export type EditableSection = {
  key: string;
  id?: string;
  title: string;
  lessons: EditableLesson[];
};

/** The fields the lesson form edits (everything but identity). */
export type LessonDraft = Pick<
  EditableLesson,
  'title' | 'videoUrl' | 'durationSec' | 'isPreview' | 'content'
>;

let newKeyCounter = 0;

/** Unique key for an item that has no server id yet. */
export function newKey(): string {
  newKeyCounter += 1;
  return `new-${newKeyCounter}`;
}

function lessonFromDto(lesson: StudioLessonDto): EditableLesson {
  return {
    key: lesson.id,
    id: lesson.id,
    title: lesson.title,
    videoUrl: lesson.videoUrl,
    durationSec: lesson.durationSec,
    isPreview: lesson.isPreview,
    content: lesson.content,
  };
}

/** Sections of the course itself (DRAFT / REJECTED). */
export function fromSections(sections: readonly StudioSectionDto[]): EditableSection[] {
  return sections.map((section) => ({
    key: section.id,
    id: section.id,
    title: section.title,
    lessons: section.lessons.map(lessonFromDto),
  }));
}

/** Sections of a revision payload; items without an id get a fresh `new-N` key. */
export function fromPayload(payload: CourseRevisionPayload): EditableSection[] {
  return payload.sections.map((section) => ({
    key: section.id ?? newKey(),
    ...(section.id ? { id: section.id } : {}),
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      key: lesson.id ?? newKey(),
      ...(lesson.id ? { id: lesson.id } : {}),
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      durationSec: lesson.durationSec,
      isPreview: lesson.isPreview,
      content: lesson.content,
    })),
  }));
}

/** The `sections` of `PUT /teacher/courses/:id/revision`. */
export function toRevisionSections(
  sections: readonly EditableSection[],
): CourseRevisionInput['sections'] {
  return sections.map((section) => ({
    ...(section.id ? { id: section.id } : {}),
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      ...(lesson.id ? { id: lesson.id } : {}),
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      durationSec: lesson.durationSec,
      isPreview: lesson.isPreview,
      content: lesson.content,
    })),
  }));
}

/** New array with the item at `index` swapped with its neighbour (`-1` up, `1` down). */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const copy = [...items];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved as T);
  return copy;
}

export function countLessons(sections: readonly EditableSection[]): number {
  return sections.reduce((sum, section) => sum + section.lessons.length, 0);
}

export function countPreviews(sections: readonly EditableSection[]): number {
  return sections.reduce(
    (sum, section) => sum + section.lessons.filter((lesson) => lesson.isPreview).length,
    0,
  );
}

export function totalDurationSec(sections: readonly EditableSection[]): number {
  return sections.reduce(
    (sum, section) =>
      sum + section.lessons.reduce((inner, lesson) => inner + lesson.durationSec, 0),
    0,
  );
}

/** Stable text of the curriculum, to tell whether a revision draft has unsaved changes. */
export function curriculumSignature(sections: readonly EditableSection[]): string {
  return JSON.stringify(toRevisionSections(sections));
}
