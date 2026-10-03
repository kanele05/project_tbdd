import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import {
  createQueryWrapper,
  createTestQueryClient,
  flushNotifications,
  makePage,
} from '@/test/queryWrapper';
import type { AnswerDto, QuestionDto } from '@/types/api';

import { qaApi } from './api';
import type { QuestionsData } from './cache';
import {
  useCourseQuestions,
  useCreateAnswer,
  useCreateQuestion,
  useQuestion,
  useQuestionAnswers,
} from './hooks';

jest.mock('./api', () => ({
  qaApi: {
    questions: jest.fn(),
    question: jest.fn(),
    answers: jest.fn(),
    createQuestion: jest.fn(),
    createAnswer: jest.fn(),
    like: jest.fn(),
    unlike: jest.fn(),
  },
}));

const mockToastError = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ error: mockToastError, success: jest.fn(), info: jest.fn() }),
}));

const mocked = qaApi as jest.Mocked<typeof qaApi>;

// TanStack Query notifies observers from a 0 ms timer; flush it so no update lands outside act().
afterEach(async () => {
  await act(flushNotifications);
});

function makeQuestion(overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id: 'q1',
    content: 'How?',
    createdAt: '2026-10-01T00:00:00.000Z',
    likeCount: 0,
    answerCount: 1,
    isLiked: false,
    user: { id: 'u1', fullName: 'Jane', avatarUrl: null },
    ...overrides,
  };
}

function makeAnswer(id: string): AnswerDto {
  return {
    id,
    content: 'Try this',
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u2', fullName: 'Tom', avatarUrl: null },
  };
}

describe('qa query hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCourseQuestions loads page 1 then page 2 and stops after the last page', async () => {
    mocked.questions
      .mockResolvedValueOnce(makePage([makeQuestion({ id: 'a' })], 1, 2))
      .mockResolvedValueOnce(makePage([makeQuestion({ id: 'b' })], 2, 2));
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useCourseQuestions('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mocked.questions).toHaveBeenNthCalledWith(1, 'c1', 1);
    expect(mocked.questions).toHaveBeenNthCalledWith(2, 'c1', 2);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('useQuestion shows the question already loaded in a list while fetching the detail', async () => {
    const detail = makeQuestion({ content: 'Fresh from server' });
    mocked.question.mockResolvedValue(detail);
    const client = createTestQueryClient();
    const cachedList: QuestionsData = {
      pageParams: [1],
      pages: [makePage([makeQuestion({ content: 'From the list' })])],
    };
    client.setQueryData(queryKeys.courseQuestions('c1'), cachedList);

    const { result } = await renderHook(() => useQuestion('q1'), {
      wrapper: createQueryWrapper(client),
    });

    expect(result.current.data?.content).toBe('From the list');
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data?.content).toBe('Fresh from server'));
  });

  it('useQuestionAnswers pages through the answers', async () => {
    mocked.answers.mockResolvedValue(makePage([makeAnswer('a1')]));
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useQuestionAnswers('q1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.pages[0]?.data[0]?.id).toBe('a1'));
    expect(mocked.answers).toHaveBeenCalledWith('q1', 1);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useCreateQuestion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the content and refreshes the question list of the course', async () => {
    mocked.createQuestion.mockResolvedValue(makeQuestion());
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useCreateQuestion('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('How do I start?');
      await flushNotifications();
    });

    expect(mocked.createQuestion).toHaveBeenCalledWith('c1', 'How do I start?');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.courseQuestions('c1') });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows a toast with the error message when the request fails', async () => {
    mocked.createQuestion.mockRejectedValue(
      new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'Not enrolled' }),
    );
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useCreateQuestion('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('Hi').catch(() => undefined);
      await flushNotifications();
    });

    expect(mockToastError).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateAnswer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bumps the answer count in the detail and the lists, then refreshes the answers', async () => {
    mocked.createAnswer.mockResolvedValue(makeAnswer('new'));
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.question('q1'), makeQuestion({ answerCount: 1 }));
    client.setQueryData<QuestionsData>(queryKeys.courseQuestions('c1'), {
      pageParams: [1],
      pages: [
        makePage([makeQuestion({ answerCount: 1 }), makeQuestion({ id: 'q2', answerCount: 5 })]),
      ],
    });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useCreateAnswer('q1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('Try this');
      await flushNotifications();
    });

    expect(mocked.createAnswer).toHaveBeenCalledWith('q1', 'Try this');
    expect(client.getQueryData<QuestionDto>(queryKeys.question('q1'))?.answerCount).toBe(2);
    const listed = client.getQueryData<QuestionsData>(queryKeys.courseQuestions('c1'));
    expect(listed?.pages[0]?.data.map((question) => question.answerCount)).toEqual([2, 5]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.questionAnswers('q1') });
  });

  it('toasts and leaves the counters untouched when posting fails', async () => {
    mocked.createAnswer.mockRejectedValue(
      new AppError({ status: 0, code: 'OFFLINE', message: 'x' }),
    );
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.question('q1'), makeQuestion({ answerCount: 1 }));
    const { result } = await renderHook(() => useCreateAnswer('q1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined);
      await flushNotifications();
    });

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<QuestionDto>(queryKeys.question('q1'))?.answerCount).toBe(1);
  });
});
