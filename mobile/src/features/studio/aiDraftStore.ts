import { create } from 'zustand';

/** Parts of an AI course draft that go straight into the course info form (SC-24). */
export type AiFieldSuggestion = {
  subtitle?: string;
  description?: string;
  benefits?: string[];
};

/** A lesson the AI outline proposes; it still needs a YouTube link and a duration. */
export type PlannedLesson = { title: string; summary: string };

type AiDraftState = {
  /** Suggestions waiting for the edit form to take them over (it clears them once applied). */
  pendingFields: AiFieldSuggestion | null;
  /**
   * Outline lessons not created yet, by section key. The curriculum editor lists them under their
   * section with an "Add" button that opens the lesson form pre-filled with title and summary.
   */
  plannedLessons: Record<string, PlannedLesson[]>;
  /** Merge more suggestions into the pending ones. */
  queueFields: (fields: AiFieldSuggestion) => void;
  /** Take the pending suggestions (and clear them). */
  takeFields: () => AiFieldSuggestion | null;
  setPlannedLessons: (planned: Record<string, PlannedLesson[]>) => void;
  /** Drop one planned lesson once it has been created (or dismissed). */
  removePlannedLesson: (sectionKey: string, index: number) => void;
  clear: () => void;
};

/**
 * Small hand-over store between the AI draft modal (SC-27) and the editors under it. The draft is
 * a suggestion only (BR-29): nothing here is saved to the server until the teacher saves.
 */
export const useAiDraftStore = create<AiDraftState>()((set, get) => ({
  pendingFields: null,
  plannedLessons: {},
  queueFields: (fields) =>
    set((state) => ({ pendingFields: { ...state.pendingFields, ...fields } })),
  takeFields: () => {
    const fields = get().pendingFields;
    if (fields) set({ pendingFields: null });
    return fields;
  },
  setPlannedLessons: (planned) => set({ plannedLessons: planned }),
  removePlannedLesson: (sectionKey, index) =>
    set((state) => {
      const rest = (state.plannedLessons[sectionKey] ?? []).filter((_, i) => i !== index);
      const next = { ...state.plannedLessons };
      if (rest.length > 0) next[sectionKey] = rest;
      else delete next[sectionKey];
      return { plannedLessons: next };
    }),
  clear: () => set({ pendingFields: null, plannedLessons: {} }),
}));
