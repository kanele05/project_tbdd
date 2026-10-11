import { useCallback, useMemo, useState } from 'react';

import { i18n } from '@/i18n';
import type { StudioCourseDetailDto, StudioRevisionDto } from '@/types/api';

import {
  countLessons,
  curriculumSignature,
  fromPayload,
  fromSections,
  moveItem,
  newKey,
  toRevisionSections,
  type EditableLesson,
  type EditableSection,
  type LessonDraft,
} from './curriculumModel';
import { useCurriculumMutations, useSaveRevision } from './hooks';
import { STUDIO_LIMITS } from './limits';

/** What the curriculum UI can do; both editing targets (course / revision) implement it. */
export type CurriculumActions = {
  addSection: (title: string) => Promise<void>;
  renameSection: (section: EditableSection, title: string) => Promise<void>;
  deleteSection: (section: EditableSection) => Promise<void>;
  moveSection: (index: number, direction: -1 | 1) => Promise<void>;
  /** `lesson = null` adds a new lesson to the section. */
  saveLesson: (
    section: EditableSection,
    lesson: EditableLesson | null,
    draft: LessonDraft,
  ) => Promise<void>;
  deleteLesson: (section: EditableSection, lesson: EditableLesson) => Promise<void>;
  moveLesson: (section: EditableSection, index: number, direction: -1 | 1) => Promise<void>;
};

function assertCanAddLesson(sections: readonly EditableSection[]): void {
  if (countLessons(sections) >= STUDIO_LIMITS.maxLessons) {
    throw new Error(i18n.t('studio:curriculum.maxLessons', { max: STUDIO_LIMITS.maxLessons }));
  }
}

function requireId(id: string | undefined): string {
  if (!id) throw new Error(i18n.t('errors:generic'));
  return id;
}

/** Curriculum of a DRAFT / REJECTED course: every action is one API call, then the detail refreshes. */
export function useDirectCurriculum(detail: StudioCourseDetailDto) {
  const mutations = useCurriculumMutations(detail.id);
  const sections = useMemo(() => fromSections(detail.sections), [detail.sections]);
  const isBusy = Object.values(mutations).some((mutation) => mutation.isPending);

  const actions: CurriculumActions = {
    addSection: async (title) => {
      await mutations.addSection.mutateAsync({ title });
    },
    renameSection: async (section, title) => {
      await mutations.renameSection.mutateAsync({
        sectionId: requireId(section.id),
        body: { title },
      });
    },
    deleteSection: async (section) => {
      await mutations.deleteSection.mutateAsync(requireId(section.id));
    },
    moveSection: async (index, direction) => {
      const ids = moveItem(sections, index, direction).map((section) => requireId(section.id));
      await mutations.reorder.mutateAsync({ target: 'sections', ids });
    },
    saveLesson: async (section, lesson, draft) => {
      if (lesson) {
        await mutations.updateLesson.mutateAsync({ lessonId: requireId(lesson.id), body: draft });
        return;
      }
      assertCanAddLesson(sections);
      await mutations.addLesson.mutateAsync({ sectionId: requireId(section.id), body: draft });
    },
    deleteLesson: async (_section, lesson) => {
      await mutations.deleteLesson.mutateAsync(requireId(lesson.id));
    },
    moveLesson: async (section, index, direction) => {
      const ids = moveItem(section.lessons, index, direction).map((item) => requireId(item.id));
      await mutations.reorder.mutateAsync({
        target: 'lessons',
        sectionId: requireId(section.id),
        ids,
      });
    },
  };
  return { sections, actions, isBusy };
}

/**
 * Curriculum of an open revision of a PUBLISHED course: edits happen on a local copy and one
 * "Save revision" sends the whole payload (`PUT .../revision`). `isDirty` drives the unsaved guard.
 */
export function useRevisionCurriculum(courseId: string, revision: StudioRevisionDto) {
  const saveMutation = useSaveRevision(courseId);
  const [draft, setDraft] = useState<EditableSection[]>(() => fromPayload(revision.payload));
  const isDirty = useMemo(
    () => curriculumSignature(draft) !== curriculumSignature(fromPayload(revision.payload)),
    [draft, revision.payload],
  );

  const update = useCallback(
    (change: (sections: EditableSection[]) => EditableSection[]) =>
      setDraft((current) => change(current)),
    [],
  );
  const mapSection = (key: string, change: (section: EditableSection) => EditableSection) =>
    update((sections) => sections.map((s) => (s.key === key ? change(s) : s)));

  const actions: CurriculumActions = {
    addSection: async (title) =>
      update((sections) => [...sections, { key: newKey(), title, lessons: [] }]),
    renameSection: async (section, title) => mapSection(section.key, (s) => ({ ...s, title })),
    deleteSection: async (section) =>
      update((sections) => sections.filter((s) => s.key !== section.key)),
    moveSection: async (index, direction) =>
      update((sections) => moveItem(sections, index, direction)),
    saveLesson: async (section, lesson, draftLesson) => {
      if (!lesson) assertCanAddLesson(draft);
      mapSection(section.key, (s) => ({
        ...s,
        lessons: lesson
          ? s.lessons.map((l) => (l.key === lesson.key ? { ...l, ...draftLesson } : l))
          : [...s.lessons, { key: newKey(), ...draftLesson }],
      }));
    },
    deleteLesson: async (section, lesson) =>
      mapSection(section.key, (s) => ({
        ...s,
        lessons: s.lessons.filter((l) => l.key !== lesson.key),
      })),
    moveLesson: async (section, index, direction) =>
      mapSection(section.key, (s) => ({ ...s, lessons: moveItem(s.lessons, index, direction) })),
  };

  const save = useCallback(async () => {
    const saved = await saveMutation.mutateAsync({
      ...revision.payload,
      sections: toRevisionSections(draft),
    });
    // New items got their ids on the server: continue from the saved copy, not from the draft.
    if (saved.revision) setDraft(fromPayload(saved.revision.payload));
  }, [draft, revision.payload, saveMutation]);

  return {
    sections: draft,
    actions,
    isBusy: false,
    isDirty,
    isSaving: saveMutation.isPending,
    save,
  };
}
