import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { AiChatMessageDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import type { TutorTurn } from '../useAiTutorChat';
import { AiTutorScreen } from './AiTutorScreen';

const mockReplace = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockClear = jest.fn();
const mockSend = jest.fn();
const mockRetry = jest.fn();
const mockReset = jest.fn();
let mockHistory: Record<string, unknown> = {};
let mockChat: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('@/features/course/hooks', () => ({
  useCourseDetail: () => ({ data: { title: 'UX Foundation: Introduction to UX' } }),
}));

jest.mock('../hooks', () => ({
  useAiChatHistory: () => mockHistory,
  useClearAiChat: () => ({ mutateAsync: mockClear }),
}));

jest.mock('../useAiTutorChat', () => ({
  useAiTutorChat: () => mockChat,
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const confirmMock = confirmAction as jest.MockedFunction<typeof confirmAction>;

function msg(id: string, role: AiChatMessageDto['role'], content: string): AiChatMessageDto {
  return { id, role, content, createdAt: '2026-10-04T10:00:00.000Z' };
}

/** Newest first, like the API. */
const PAGE = [
  msg('m4', 'ASSISTANT', 'Second answer'),
  msg('m3', 'USER', 'Second question'),
  msg('m2', 'ASSISTANT', 'First answer'),
  msg('m1', 'USER', 'First question'),
];

function setHistory(overrides: Record<string, unknown> = {}) {
  mockHistory = {
    data: { pages: [{ data: PAGE, meta: { page: 1, limit: 20, total: 4, totalPages: 1 } }] },
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
    ...overrides,
  };
}

function setChat(overrides: Record<string, unknown> = {}) {
  mockChat = {
    turn: null,
    isStreaming: false,
    cooldownSec: 0,
    send: mockSend,
    retry: mockRetry,
    reset: mockReset,
    ...overrides,
  };
}

function turn(overrides: Partial<TutorTurn> = {}): TutorTurn {
  return {
    question: 'Third question',
    answer: '',
    status: 'streaming',
    messageId: null,
    error: null,
    ...overrides,
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <AiTutorScreen courseId="course-1" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockResolvedValue(true);
  mockClear.mockResolvedValue(undefined);
  setHistory();
  setChat();
});

describe('AiTutorScreen', () => {
  it('shows the saved conversation with the oldest message at the top', async () => {
    await renderScreen();

    const labels = screen
      .getAllByLabelText(/^(You|AI Tutor) said:/)
      .map((node) => node.props.accessibilityLabel as string);
    expect(labels).toEqual([
      'You said: First question',
      'AI Tutor said: First answer',
      'You said: Second question',
      'AI Tutor said: Second answer',
    ]);
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
  });

  it('invites to ask with quick questions when there is no conversation yet', async () => {
    setHistory({
      data: { pages: [{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }] },
    });
    await renderScreen();

    expect(screen.getByText('Ask me anything about this course')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tutor-suggestion-start'));

    expect(mockSend).toHaveBeenCalledWith('What should I learn first?');
  });

  it('sends what the user types and empties the field', async () => {
    await renderScreen();

    await fireEvent.changeText(screen.getByTestId('tutor-input'), '  Explain useEffect  ');
    await fireEvent.press(screen.getByTestId('tutor-send'));

    expect(mockSend).toHaveBeenCalledWith('  Explain useEffect  ');
    await waitFor(() => expect(screen.getByTestId('tutor-input').props.value).toBe(''));
  });

  it('blocks sending while an answer is being written', async () => {
    const streaming = turn({ answer: 'Typing' });
    setChat({ turn: streaming, isStreaming: true });
    await renderScreen();

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Another one');

    expect(screen.getByTestId('tutor-send')).toBeDisabled();
    // The streaming answer keeps one constant label (the final text is announced once it is done).
    expect(screen.getByText('Typing')).toBeOnTheScreen();
    expect(screen.getByLabelText('AI Tutor is writing...')).toBeOnTheScreen();
    expect(screen.getByLabelText('You said: Third question')).toBeOnTheScreen();
  });

  it('shows the typing indicator before the first word arrives', async () => {
    setChat({ turn: turn(), isStreaming: true });
    await renderScreen();

    expect(screen.getByText('AI Tutor is writing...')).toBeOnTheScreen();
  });

  it('does not show a finished turn twice once the history has its answer', async () => {
    setChat({ turn: turn({ answer: 'Second answer', status: 'done', messageId: 'm4' }) });
    await renderScreen();

    expect(screen.queryByTestId('tutor-turn')).not.toBeOnTheScreen();
    expect(screen.getAllByLabelText('AI Tutor said: Second answer')).toHaveLength(1);
  });

  it('keeps showing a finished turn until the history has it', async () => {
    setChat({ turn: turn({ answer: 'New answer', status: 'done', messageId: 'm6' }) });
    await renderScreen();

    expect(screen.getByTestId('tutor-turn')).toBeOnTheScreen();
    expect(screen.getByLabelText('AI Tutor said: New answer')).toBeOnTheScreen();
  });

  it('keeps a cut-off answer, explains it and lets the user send again', async () => {
    setChat({
      turn: turn({
        answer: 'Half of the answ',
        status: 'error',
        error: {
          message: 'The AI assistant is unavailable right now.',
          retryAfterSec: null,
          isNotEnrolled: false,
          isCanceled: false,
          isUnauthorized: false,
          isTemporary: true,
        },
      }),
    });
    await renderScreen();

    expect(screen.getByLabelText('AI Tutor said: Half of the answ')).toBeOnTheScreen();
    expect(screen.getByText('The AI assistant is unavailable right now.')).toBeOnTheScreen();
    expect(screen.getByText('The answer was cut off. Nothing was saved.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('tutor-resend'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('disables "Send again" and the composer during a rate limit countdown', async () => {
    setChat({
      cooldownSec: 12,
      turn: turn({
        status: 'error',
        error: {
          message: 'The AI assistant is busy.',
          retryAfterSec: 12,
          isNotEnrolled: false,
          isCanceled: false,
          isUnauthorized: false,
          isTemporary: true,
        },
      }),
    });
    await renderScreen();

    expect(screen.getAllByText('You can ask again in 12 s').length).toBeGreaterThan(0);
    expect(screen.getByTestId('tutor-resend')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'hello');
    expect(screen.getByTestId('tutor-send')).toBeDisabled();
  });

  it('loads earlier messages on request', async () => {
    setHistory({ hasNextPage: true });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Load earlier messages' }));

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  describe('clearing the conversation', () => {
    it('asks first, then clears the history and the local turn', async () => {
      confirmMock.mockResolvedValue(true);
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Clear conversation' }));

      await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Clear this conversation?', isDestructive: true }),
      );
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the user cancels', async () => {
      confirmMock.mockResolvedValue(false);
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Clear conversation' }));

      await waitFor(() => expect(confirmMock).toHaveBeenCalled());
      expect(mockClear).not.toHaveBeenCalled();
    });

    it('is disabled while there is nothing to clear', async () => {
      setHistory({
        data: { pages: [{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }] },
      });
      await renderScreen();

      expect(screen.getByRole('button', { name: 'Clear conversation' })).toBeDisabled();
    });
  });

  describe('states', () => {
    it('shows a skeleton while the history loads', async () => {
      setHistory({ data: undefined, isPending: true, fetchStatus: 'fetching' });
      await renderScreen();

      expect(screen.getByTestId('tutor-skeleton')).toBeOnTheScreen();
    });

    it('shows an error with Retry when the history fails', async () => {
      setHistory({
        data: undefined,
        isError: true,
        error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
      });
      await renderScreen();

      expect(screen.getByText("Couldn't load your conversation")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('asks to enroll when the server answers 403 NOT_ENROLLED', async () => {
      setHistory({
        data: undefined,
        isError: true,
        error: new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'no' }),
      });
      await renderScreen();

      expect(screen.getByText('Enroll to use the AI Tutor')).toBeOnTheScreen();
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/course/[id]',
        params: { id: 'course-1' },
      });
    });

    it('shows the offline state when nothing is cached', async () => {
      setHistory({ data: undefined, isPending: true, fetchStatus: 'paused' });
      await renderScreen();

      expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
    });
  });
});
