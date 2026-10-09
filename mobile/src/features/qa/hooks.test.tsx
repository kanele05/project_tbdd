import { QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { Paginated, QuestionDto } from '@/types/api';

import { qaApi } from './api';
import { useToggleQuestionLike } from './hooks';

jest.mock('./api', () => ({
  qaApi: { like: jest.fn(), unlike: jest.fn(), createAnswer: jest.fn(), question: jest.fn() },
}));

const mockLike = qaApi.like as jest.Mock;
const mockUnlike = qaApi.unlike as jest.Mock;

function makeQuestion(overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id: 'question-1',
    content: 'How?',
    createdAt: '2026-10-01T00:00:00.000Z',
    likeCount: 10,
    answerCount: 2,
    isLiked: false,
    user: { id: 'user-1', fullName: 'Jane', avatarUrl: null },
    ...overrides,
  };
}

function setup() {
  const queryClient = createTestQueryClient();
  const listKey = queryKeys.courseQuestions('course-1');
  const list: InfiniteData<Paginated<QuestionDto>, number> = {
    pageParams: [1],
    pages: [
      {
        data: [makeQuestion(), makeQuestion({ id: 'question-2', likeCount: 3 })],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
    ],
  };
  queryClient.setQueryData(listKey, list);
  queryClient.setQueryData(queryKeys.question('question-1'), makeQuestion());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  const readList = () =>
    queryClient.getQueryData<InfiniteData<Paginated<QuestionDto>, number>>(listKey)?.pages[0]?.data;
  return { queryClient, wrapper, readList };
}

describe('useToggleQuestionLike', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the list and the detail right away, before the server answers', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockLike.mockReturnValue(new Promise((done) => (resolve = done)));
    const { queryClient, wrapper, readList } = setup();
    const { result } = await renderHook(() => useToggleQuestionLike(), { wrapper });

    await act(async () => {
      result.current.mutate({ questionId: 'question-1', isLiked: false });
    });

    await waitFor(() => expect(readList()?.[0]).toMatchObject({ isLiked: true, likeCount: 11 }));
    expect(queryClient.getQueryData<QuestionDto>(queryKeys.question('question-1'))).toMatchObject({
      isLiked: true,
      likeCount: 11,
    });
    expect(readList()?.[1]).toMatchObject({ isLiked: false, likeCount: 3 });

    await act(async () => resolve({ likeCount: 11, isLiked: true }));
  });

  it('unlikes with DELETE and lowers the count', async () => {
    mockUnlike.mockResolvedValue({ likeCount: 9, isLiked: false });
    const { queryClient, wrapper, readList } = setup();
    queryClient.setQueryData(queryKeys.question('question-1'), makeQuestion({ isLiked: true }));
    const { result } = await renderHook(() => useToggleQuestionLike(), { wrapper });

    await act(async () => {
      result.current.mutate({ questionId: 'question-1', isLiked: true });
    });

    await waitFor(() => expect(mockUnlike).toHaveBeenCalledWith('question-1'));
    await waitFor(() => expect(readList()?.[0]).toMatchObject({ likeCount: 9, isLiked: false }));
  });

  it('rolls back when the request fails (offline)', async () => {
    mockLike.mockRejectedValue(new AppError({ status: 0, code: 'OFFLINE', message: 'offline' }));
    const { wrapper, readList } = setup();
    const { result } = await renderHook(() => useToggleQuestionLike(), { wrapper });

    await act(async () => {
      result.current.mutate({ questionId: 'question-1', isLiked: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readList()?.[0]).toMatchObject({ isLiked: false, likeCount: 10 });
  });
});
