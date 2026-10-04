import type { AiQuizQuestionDto } from '@/types/api';

/**
 * State of one run through a quiz: which question is open, what was chosen for each, and whether
 * the results are showing. A pure reducer, so the rules are tested without rendering anything.
 */
export type QuizSession = {
  total: number;
  /** Index of the open question. */
  index: number;
  /** Chosen option per question (`null` = not answered yet). */
  answers: (number | null)[];
  isFinished: boolean;
};

export type QuizAction =
  { type: 'select'; optionIndex: number } | { type: 'next' } | { type: 'restart' };

export function createQuizSession(total: number): QuizSession {
  return { total, index: 0, answers: Array.from({ length: total }, () => null), isFinished: false };
}

export function quizReducer(state: QuizSession, action: QuizAction): QuizSession {
  switch (action.type) {
    case 'select': {
      // The answer is final: choosing again (or after the end) does nothing.
      if (state.isFinished || state.answers[state.index] !== null) return state;
      const answers = state.answers.slice();
      answers[state.index] = action.optionIndex;
      return { ...state, answers };
    }
    case 'next': {
      if (state.isFinished || state.answers[state.index] === null) return state;
      return state.index + 1 >= state.total
        ? { ...state, isFinished: true }
        : { ...state, index: state.index + 1 };
    }
    case 'restart':
      return createQuizSession(state.total);
  }
}

/** Number of questions answered correctly. */
export function getScore(
  questions: readonly AiQuizQuestionDto[],
  answers: readonly (number | null)[],
): number {
  return questions.reduce(
    (score, question, index) => (answers[index] === question.correctIndex ? score + 1 : score),
    0,
  );
}

export type ScoreTier = 'perfect' | 'good' | 'ok' | 'low';

/** Picks the encouragement shown with the score: 5/5, 4/5, 3/5, below. */
export function getScoreTier(score: number, total: number): ScoreTier {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 1) return 'perfect';
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.6) return 'ok';
  return 'low';
}

/** 0 -> "A" ... 3 -> "D". */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
