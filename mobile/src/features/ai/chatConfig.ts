/** PLAN §9.2: the question is 1-1000 characters after trimming. */
export const AI_CHAT_MAX_LENGTH = 1000;

/** Quick questions of the empty chat; the label is `ai:tutor.suggestions.<key>`. */
export const TUTOR_SUGGESTION_KEYS = ['summary', 'start', 'explain', 'practice'] as const;
export type TutorSuggestionKey = (typeof TUTOR_SUGGESTION_KEYS)[number];
