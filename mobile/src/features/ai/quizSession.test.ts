import type { AiQuizQuestionDto } from '@/types/api';

import {
  createQuizSession,
  getScore,
  getScoreTier,
  optionLetter,
  quizReducer,
  type QuizSession,
} from './quizSession';

const QUESTIONS: AiQuizQuestionDto[] = [0, 1, 2].map((correctIndex) => ({
  question: `Q${correctIndex}`,
  options: ['a', 'b', 'c', 'd'],
  correctIndex,
  explanation: 'because',
}));

function run(state: QuizSession, ...actions: Parameters<typeof quizReducer>[1][]): QuizSession {
  return actions.reduce(quizReducer, state);
}

describe('quizReducer', () => {
  it('starts on the first question with nothing answered', () => {
    expect(createQuizSession(3)).toEqual({
      total: 3,
      index: 0,
      answers: [null, null, null],
      isFinished: false,
    });
  });

  it('records the chosen option of the open question', () => {
    const state = run(createQuizSession(3), { type: 'select', optionIndex: 2 });
    expect(state.answers).toEqual([2, null, null]);
  });

  it('keeps the first answer (it is final)', () => {
    const state = run(
      createQuizSession(3),
      { type: 'select', optionIndex: 1 },
      { type: 'select', optionIndex: 3 },
    );
    expect(state.answers[0]).toBe(1);
  });

  it('does not move on before the question is answered', () => {
    const state = run(createQuizSession(3), { type: 'next' });
    expect(state.index).toBe(0);
  });

  it('moves to the next question, and to the results after the last one', () => {
    let state = createQuizSession(2);
    state = run(state, { type: 'select', optionIndex: 0 }, { type: 'next' });
    expect(state).toMatchObject({ index: 1, isFinished: false });
    state = run(state, { type: 'select', optionIndex: 1 }, { type: 'next' });
    expect(state).toMatchObject({ index: 1, isFinished: true });
  });

  it('ignores answers once finished', () => {
    const finished: QuizSession = { total: 1, index: 0, answers: [0], isFinished: true };
    expect(run(finished, { type: 'select', optionIndex: 2 })).toBe(finished);
    expect(run(finished, { type: 'next' })).toBe(finished);
  });

  it('restarts with the same number of questions', () => {
    const state = run(
      createQuizSession(3),
      { type: 'select', optionIndex: 0 },
      { type: 'next' },
      { type: 'restart' },
    );
    expect(state).toEqual(createQuizSession(3));
  });
});

describe('getScore / getScoreTier / optionLetter', () => {
  it('counts the correct answers and ignores unanswered ones', () => {
    expect(getScore(QUESTIONS, [0, 1, 2])).toBe(3);
    expect(getScore(QUESTIONS, [0, 3, null])).toBe(1);
    expect(getScore(QUESTIONS, [])).toBe(0);
  });

  it('maps the ratio to a message tier', () => {
    expect(getScoreTier(5, 5)).toBe('perfect');
    expect(getScoreTier(4, 5)).toBe('good');
    expect(getScoreTier(3, 5)).toBe('ok');
    expect(getScoreTier(2, 5)).toBe('low');
    expect(getScoreTier(0, 0)).toBe('low');
  });

  it('labels options A to D', () => {
    expect([0, 1, 2, 3].map(optionLetter)).toEqual(['A', 'B', 'C', 'D']);
  });
});
