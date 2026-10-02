import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { AnswerDto, QuestionDto } from '@/types/api';

import { QuestionDetailScreen } from './QuestionDetailScreen';
import { QaTab } from '../components/QaTab';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRefetch = jest.fn();
const mockToggleLike = jest.fn();
const mockCreateQuestion = jest.fn();
const mockCreateAnswer = jest.fn();
let mockQuestions: Record<string, unknown> = {};
let mockQuestion: Record<string, unknown> = {};
let mockAnswers: Record<string, unknown> = {};

jest.mock('@shopify/flash-list', () => {
  const { forwardRef } = jest.requireActual('react');
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: forwardRef((props: object, ref: unknown) => <FlatList ref={ref} {...props} />),
  };
});

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: () => mockBack(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useCourseQuestions: () => mockQuestions,
  useQuestion: () => mockQuestion,
  useQuestionAnswers: () => mockAnswers,
  useCreateQuestion: () => ({ mutateAsync: mockCreateQuestion }),
  useCreateAnswer: () => ({ mutateAsync: mockCreateAnswer }),
  useToggleQuestionLike: () => ({ mutate: mockToggleLike }),
}));

function makeQuestion(id: string, overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id,
    content: `Question ${id}`,
    createdAt: new Date().toISOString(),
    likeCount: 4,
    answerCount: 2,
    isLiked: false,
    user: { id: 'user-1', fullName: 'Jane Barry', avatarUrl: null },
    ...overrides,
  };
}

function makeAnswer(id: string): AnswerDto {
  return {
    id,
    content: `Answer ${id}`,
    createdAt: new Date().toISOString(),
    user: { id: 'user-2', fullName: 'Thomas', avatarUrl: null },
  };
}

function infinite<T>(items: T[]) {
  return { pages: [{ data: items, meta: { page: 1, totalPages: 1 } }] };
}

function listState(items: unknown[] | undefined, overrides: Record<string, unknown> = {}) {
  return {
    data: items ? infinite(items) : undefined,
    isPending: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchStatus: 'idle',
    error: null,
    refetch: mockRefetch,
    fetchNextPage: jest.fn(),
    ...overrides,
  };
}

describe('QaTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestions = listState([makeQuestion('q1'), makeQuestion('q2')]);
  });

  async function renderTab() {
    return render(
      <ToastProvider>
        <QaTab courseId="course-1" />
      </ToastProvider>,
    );
  }

  it('lists the questions with the composer pinned below', async () => {
    await renderTab();

    expect(screen.getByText('Question q1')).toBeOnTheScreen();
    expect(screen.getByText('Question q2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Write a Q&A...')).toBeOnTheScreen();
  });

  it('likes a question and opens the discussion', async () => {
    await renderTab();

    await fireEvent.press(screen.getByTestId('question-like-q1'));
    expect(mockToggleLike).toHaveBeenCalledWith({ questionId: 'q1', isLiked: false });

    await fireEvent.press(screen.getByTestId('question-comments-q2'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/question/[id]', params: { id: 'q2' } });
  });

  it('posts a new question from the composer', async () => {
    mockCreateQuestion.mockResolvedValue(makeQuestion('q3'));
    await renderTab();

    await fireEvent.changeText(screen.getByLabelText('Write a Q&A...'), 'How long is it?');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalledWith('How long is it?'));
  });

  it('shows an empty state when nobody asked yet', async () => {
    mockQuestions = listState([]);
    await renderTab();

    expect(screen.getByText('No questions yet')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    mockQuestions = listState(undefined, {
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await renderTab();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('sends a not-enrolled user back to the course with a message (403)', async () => {
    mockQuestions = listState(undefined, {
      isError: true,
      error: new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'no' }),
    });
    await renderTab();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/course/[id]',
        params: { id: 'course-1' },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('toast', { includeHiddenElements: true })).toHaveTextContent(
        'Enroll in this course to unlock this content.',
        { exact: false },
      ),
    );
  });

  it('shows the offline state without cached data', async () => {
    mockQuestions = listState(undefined, { isPending: true, fetchStatus: 'paused' });
    await renderTab();

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
  });
});

describe('QuestionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestion = {
      data: makeQuestion('q1'),
      isPending: false,
      isError: false,
      fetchStatus: 'idle',
      error: null,
      refetch: mockRefetch,
    };
    mockAnswers = listState([makeAnswer('a1'), makeAnswer('a2')]);
  });

  async function renderScreen() {
    return render(
      <ToastProvider>
        <QuestionDetailScreen questionId="q1" />
      </ToastProvider>,
    );
  }

  it('shows the question, its replies and the reply composer', async () => {
    await renderScreen();

    expect(screen.getByText('Question q1')).toBeOnTheScreen();
    expect(screen.getByText('2 replies')).toBeOnTheScreen();
    expect(screen.getByText('Answer a1')).toBeOnTheScreen();
    expect(screen.getByText('Answer a2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Write a reply...')).toBeOnTheScreen();
  });

  it('posts a reply', async () => {
    mockCreateAnswer.mockResolvedValue(makeAnswer('a3'));
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Write a reply...'), 'Try the template.');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mockCreateAnswer).toHaveBeenCalledWith('Try the template.'));
  });

  it('likes the question', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('question-like-q1'));

    expect(mockToggleLike).toHaveBeenCalledWith({ questionId: 'q1', isLiked: false });
  });

  it('shows an empty state when there is no reply yet', async () => {
    mockAnswers = listState([]);
    await renderScreen();

    expect(screen.getByText('No replies yet')).toBeOnTheScreen();
  });

  it('goes back when the user is not enrolled (403)', async () => {
    mockQuestion = {
      data: undefined,
      isPending: false,
      isError: true,
      fetchStatus: 'idle',
      error: new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'no' }),
      refetch: mockRefetch,
    };
    await renderScreen();

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('shows an error with Retry when the question cannot be loaded', async () => {
    mockQuestion = {
      data: undefined,
      isPending: false,
      isError: true,
      fetchStatus: 'idle',
      error: new AppError({ status: 404, code: 'QUESTION_NOT_FOUND', message: 'gone' }),
      refetch: mockRefetch,
    };
    await renderScreen();

    expect(screen.getByText("Couldn't load this question")).toBeOnTheScreen();
    expect(screen.queryByLabelText('Write a reply...')).not.toBeOnTheScreen();
  });
});
