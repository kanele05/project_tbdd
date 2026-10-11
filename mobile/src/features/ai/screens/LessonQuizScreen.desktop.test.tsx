import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { AiQuizDto } from '@/types/api';

import { LessonQuizScreen } from './LessonQuizScreen';

const mockBack = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: () => mockBack(), canGoBack: () => true },
}));
jest.mock('../hooks', () => ({
  useAiLessonQuiz: () => ({ mutate: jest.fn(), data: QUIZ, error: null, isPending: false }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

const QUIZ: AiQuizDto = {
  lessonId: 'lesson-1',
  lang: 'en',
  questions: [
    {
      question: 'What is UX?',
      options: ['Experience', 'Paint', 'Code', 'Sound'],
      correctIndex: 0,
      explanation: 'It is about the experience.',
    },
  ],
  model: 'mock-ai-1',
  generatedAt: '2026-10-04T10:00:00.000Z',
};

async function renderScreen() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <LessonQuizScreen courseId="course-1" lessonId="lesson-1" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('LessonQuizScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('puts the question in a centered card and lets the options be answered', async () => {
    await renderScreen();

    expect(screen.getByTestId('quiz-desktop')).toBeOnTheScreen();
    expect(screen.getByTestId('quiz-card')).toBeOnTheScreen();
    expect(screen.getByText('What is UX?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('quiz-option-0'));
    expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen();
  });

  it('hides the keyboard tip outside the web', async () => {
    await renderScreen();
    expect(screen.queryByTestId('quiz-key-hint')).not.toBeOnTheScreen();
  });

  it('shows the keyboard tip on the web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderScreen();
    expect(screen.getByTestId('quiz-key-hint')).toBeOnTheScreen();
  });

  it('keeps the phone layout under 768 dp', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('quiz-desktop')).not.toBeOnTheScreen();
    expect(screen.getByText('What is UX?')).toBeOnTheScreen();
  });
});
