import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import type { AiLessonSummaryDto } from '@/types/api';

import { LessonAiPanel } from './LessonAiPanel';

const mockPush = jest.fn();
const mockSummaryHook = jest.fn();
const mockRefetch = jest.fn();
let mockSummary: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../hooks', () => ({
  useAiLessonSummary: (lessonId: string) => {
    mockSummaryHook(lessonId);
    return mockSummary;
  },
}));

const SUMMARY: AiLessonSummaryDto = {
  lessonId: 'lesson-2',
  lang: 'en',
  summary: 'This lesson introduces hooks.',
  keyPoints: [
    'Hooks run on every render',
    'Never call a hook in a loop',
    'useEffect needs cleanup',
  ],
  model: 'mock-ai-1',
  generatedAt: '2026-10-04T10:00:00.000Z',
};

function setSummary(overrides: Record<string, unknown> = {}) {
  mockSummary = {
    data: SUMMARY,
    isPending: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  };
}

async function renderPanel(lessonId: string | null = 'lesson-2') {
  return render(<LessonAiPanel courseId="course-1" lessonId={lessonId} lessonTitle="Hooks 101" />);
}

beforeEach(() => {
  jest.clearAllMocks();
  setSummary();
});

describe('LessonAiPanel', () => {
  it('names the lesson being studied', async () => {
    await renderPanel();

    expect(screen.getByText('AI Tutor')).toBeOnTheScreen();
    expect(screen.getByText('Currently: Hooks 101')).toBeOnTheScreen();
  });

  it('opens the AI Tutor chat of the course', async () => {
    await renderPanel();

    await fireEvent.press(screen.getByRole('button', { name: 'Ask AI Tutor' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]/tutor',
      params: { courseId: 'course-1' },
    });
  });

  it('opens the quiz of the current lesson', async () => {
    await renderPanel();

    await fireEvent.press(screen.getByRole('button', { name: 'Quiz' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]/quiz',
      params: { courseId: 'course-1', lessonId: 'lesson-2' },
    });
  });

  it('does not ask the AI for a summary until the user opens it', async () => {
    await renderPanel();

    expect(mockSummaryHook).not.toHaveBeenCalled();
    expect(screen.queryByTestId('summary-content')).not.toBeOnTheScreen();
  });

  it('shows the summary and the key points, tagged as AI-made, and hides it again', async () => {
    await renderPanel();

    await fireEvent.press(screen.getByTestId('toggle-summary'));

    expect(mockSummaryHook).toHaveBeenCalledWith('lesson-2');
    expect(screen.getByText('This lesson introduces hooks.')).toBeOnTheScreen();
    expect(screen.getByText('Hooks run on every render')).toBeOnTheScreen();
    expect(screen.getByText('useEffect needs cleanup')).toBeOnTheScreen();
    expect(screen.getByText('Created by AI')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Hide summary' }));
    expect(screen.queryByTestId('summary-content')).not.toBeOnTheScreen();
  });

  it('shows skeleton lines while the summary is being written', async () => {
    setSummary({ data: undefined, isPending: true });
    await renderPanel();

    await fireEvent.press(screen.getByTestId('toggle-summary'));

    expect(screen.getByTestId('summary-loading')).toBeOnTheScreen();
  });

  it('shows the AI error and lets the user retry', async () => {
    setSummary({
      data: undefined,
      isError: true,
      error: new AppError({ status: 503, code: 'AI_UNAVAILABLE', message: 'x' }),
    });
    await renderPanel();

    await fireEvent.press(screen.getByTestId('toggle-summary'));

    expect(screen.getByText(/isn't available/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('explains a rate limit and a missing enrollment with their own messages', async () => {
    setSummary({
      data: undefined,
      isError: true,
      error: new AppError({
        status: 429,
        code: 'AI_RATE_LIMITED',
        message: 'x',
        details: { retryAfterSec: 20 },
      }),
    });
    const { unmount } = await renderPanel();
    await fireEvent.press(screen.getByTestId('toggle-summary'));
    expect(screen.getByText(/busy right now/)).toBeOnTheScreen();
    await unmount();

    setSummary({
      data: undefined,
      isError: true,
      error: new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'x' }),
    });
    await renderPanel();
    await fireEvent.press(screen.getByTestId('toggle-summary'));
    expect(screen.getByText('Enroll in this course to unlock this content.')).toBeOnTheScreen();
  });

  it('disables summary and quiz until a lesson is known', async () => {
    await renderPanel(null);

    expect(screen.getByTestId('toggle-summary')).toBeDisabled();
    expect(screen.getByTestId('open-quiz')).toBeDisabled();
    expect(screen.getByTestId('ask-tutor')).toBeEnabled();
  });
});
