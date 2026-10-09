import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { AiQuizDto } from '@/types/api';

import { LessonQuizScreen } from './LessonQuizScreen';

const mockMutate = jest.fn();
const mockBack = jest.fn();
let mockMutation: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: () => mockBack(), canGoBack: () => true },
}));

jest.mock('../hooks', () => ({
  useAiLessonQuiz: () => mockMutation,
}));

function question(index: number, correctIndex: number) {
  return {
    question: `Question ${index}?`,
    options: [`A${index}`, `B${index}`, `C${index}`, `D${index}`],
    correctIndex,
    explanation: `Because ${index}.`,
  };
}

const QUIZ: AiQuizDto = {
  lessonId: 'lesson-1',
  lang: 'en',
  questions: [question(1, 0), question(2, 1), question(3, 2)],
  model: 'mock-ai-1',
  generatedAt: '2026-10-04T10:00:00.000Z',
};

function setMutation(overrides: Record<string, unknown> = {}) {
  mockMutation = {
    mutate: mockMutate,
    data: QUIZ,
    error: null,
    isPending: false,
    ...overrides,
  };
}

async function renderScreen(lessonId: string | null = 'lesson-1', queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <LessonQuizScreen courseId="course-1" lessonId={lessonId} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function answerAll(options: readonly number[]) {
  for (const option of options) {
    await fireEvent.press(screen.getByTestId(`quiz-option-${option}`));
    await fireEvent.press(screen.getByTestId('quiz-next'));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  setMutation();
});

describe('LessonQuizScreen', () => {
  it('starts the quiz as soon as it opens', async () => {
    setMutation({ data: undefined, isPending: true });
    await renderScreen();

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('quiz-loading')).toBeOnTheScreen();
  });

  it('reuses a quiz already in the cache instead of asking the AI again', async () => {
    setMutation({ data: undefined });
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.aiLessonQuiz('lesson-1', 'en'), QUIZ);

    await renderScreen('lesson-1', client);

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText('Question 1?')).toBeOnTheScreen();
  });

  it('shows the question, the progress and the AI badge', async () => {
    await renderScreen();

    expect(screen.getByText('Question 1?')).toBeOnTheScreen();
    expect(screen.getByText('Question 1 of 3')).toBeOnTheScreen();
    expect(screen.getByText('Created by AI')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^[A-D]\. / })).toHaveLength(4);
    expect(screen.queryByTestId('quiz-feedback')).not.toBeOnTheScreen();
  });

  it('tells the user a right answer is right and explains it', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('quiz-option-0'));

    expect(screen.getByText('Correct!')).toBeOnTheScreen();
    expect(screen.getByText('Because 1.')).toBeOnTheScreen();
    expect(screen.queryByText(/The right answer/)).not.toBeOnTheScreen();
  });

  it('tells the user a wrong answer is wrong and shows the right one', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('quiz-option-2'));

    expect(screen.getByText('Not quite')).toBeOnTheScreen();
    expect(screen.getByText('The right answer: A. A1')).toBeOnTheScreen();
    expect(screen.getByText('Because 1.')).toBeOnTheScreen();
  });

  it('locks the question after the first choice', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('quiz-option-2'));
    await fireEvent.press(screen.getByTestId('quiz-option-0'));

    expect(screen.getByText('Not quite')).toBeOnTheScreen();
    expect(screen.getByTestId('quiz-option-0')).toBeDisabled();
  });

  it('walks through the questions and ends with the score, the review and the actions', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('quiz-option-0')); // right
    await fireEvent.press(screen.getByTestId('quiz-next'));
    expect(screen.getByText('Question 2 of 3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('quiz-option-3')); // wrong
    await fireEvent.press(screen.getByTestId('quiz-next'));
    await fireEvent.press(screen.getByTestId('quiz-option-2')); // right
    expect(screen.getByRole('button', { name: 'See results' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('quiz-next'));

    expect(screen.getByTestId('quiz-result')).toBeOnTheScreen();
    expect(screen.getByLabelText('You answered 2 out of 3 correctly')).toBeOnTheScreen();
    expect(screen.getByText('2 / 3')).toBeOnTheScreen();
    expect(screen.getByText('Your answers')).toBeOnTheScreen();
    expect(screen.getByText('Question 2?')).toBeOnTheScreen();
  });

  it('lets the user retake the same questions from the start', async () => {
    await renderScreen();
    await answerAll([0, 1, 2]);
    expect(screen.getByText('Perfect score. You have this lesson down.')).toBeOnTheScreen();

    mockMutate.mockClear();
    await fireEvent.press(screen.getByTestId('quiz-retake'));

    expect(screen.getByText('Question 1 of 3')).toBeOnTheScreen();
    expect(screen.queryByTestId('quiz-feedback')).not.toBeOnTheScreen();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('goes back to the lesson from the results', async () => {
    await renderScreen();
    await answerAll([0, 1, 2]);

    await fireEvent.press(screen.getByTestId('quiz-back'));

    expect(mockBack).toHaveBeenCalled();
  });

  it.each([
    ['429 AI_RATE_LIMITED', 429, 'AI_RATE_LIMITED', /overloaded|busy|wait/i],
    ['503 AI_UNAVAILABLE', 503, 'AI_UNAVAILABLE', /isn't available/i],
  ])('shows %s with Retry', async (_name, status, code, message) => {
    setMutation({
      data: undefined,
      error: new AppError({ status, code, message: 'x', details: { retryAfterSec: 5 } }),
    });
    await renderScreen();

    expect(screen.getByText("Couldn't create the quiz")).toBeOnTheScreen();
    expect(screen.getByText(message)).toBeOnTheScreen();
    mockMutate.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('asks to open a lesson first when there is no lesson id', async () => {
    await renderScreen(null);

    expect(screen.getByText('No lesson selected')).toBeOnTheScreen();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
