import { QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { AnswerDto, Paginated, ReviewDto, TeacherProfileDto } from '@/types/api';

import { teachingApi } from './api';
import {
  useCourseStats,
  useDeleteReviewReply,
  useIsCourseOwner,
  usePinAnswer,
  useReplyToReview,
  useTeacherProfile,
  useUpdateTeacherProfile,
} from './hooks';

jest.mock('./api', () => ({
  teachingApi: {
    profile: jest.fn(),
    updateProfile: jest.fn(),
    stats: jest.fn(),
    submissions: jest.fn(),
    grade: jest.fn(),
    replyToReview: jest.fn(),
    deleteReviewReply: jest.fn(),
    pinAnswer: jest.fn(),
    unpinAnswer: jest.fn(),
  },
}));

const mocked = teachingApi as unknown as Record<keyof typeof teachingApi, jest.Mock>;

const PROFILE: TeacherProfileDto = {
  id: 'teacher-1',
  jobTitle: 'Designer',
  bio: '',
  organization: null,
  location: null,
  timezone: null,
};

function setRole(role: 'STUDENT' | 'TEACHER') {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'a@b.c',
      fullName: 'A',
      headline: null,
      avatarUrl: null,
      coverUrl: null,
      role,
    },
  });
}

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

type TestClient = ReturnType<typeof setup>['queryClient'];

function answer(id: string, isPinned = false): AnswerDto {
  return {
    id,
    content: id,
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u', fullName: 'U', avatarUrl: null },
    isInstructor: false,
    isPinned,
  };
}

function review(id: string, teacherReply: string | null = null): ReviewDto {
  return {
    id,
    rating: 5,
    content: 'Great course',
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u', fullName: 'U', avatarUrl: null },
    teacherReply,
    teacherRepliedAt: teacherReply ? '2026-10-02T00:00:00.000Z' : null,
  };
}

function pages<T>(data: T[]): InfiniteData<Paginated<T>, number> {
  return {
    pageParams: [1],
    pages: [{ data, meta: { page: 1, limit: 20, total: data.length, totalPages: 1 } }],
  };
}

describe('teacher profile / ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.profile.mockResolvedValue(PROFILE);
  });

  it('does not request the teacher profile for a student', async () => {
    setRole('STUDENT');
    const { wrapper } = setup();

    const { result } = await renderHook(() => useIsCourseOwner('teacher-1'), { wrapper });

    expect(result.current).toBe(false);
    expect(mocked.profile).not.toHaveBeenCalled();
  });

  it('knows a teacher owns the courses whose teacher id is their profile id', async () => {
    setRole('TEACHER');
    const { wrapper } = setup();

    const owner = await renderHook(() => useIsCourseOwner('teacher-1'), { wrapper });
    const other = await renderHook(() => useIsCourseOwner('teacher-2'), { wrapper });
    const unknown = await renderHook(() => useIsCourseOwner(undefined), { wrapper });

    await waitFor(() => expect(owner.result.current).toBe(true));
    expect(other.result.current).toBe(false);
    expect(unknown.result.current).toBe(false);
    expect(mocked.profile).toHaveBeenCalledTimes(1);
  });

  it('exposes the profile query', async () => {
    setRole('TEACHER');
    const { wrapper } = setup();
    const { result } = await renderHook(() => useTeacherProfile(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(PROFILE));
  });

  it('caches the saved profile and refreshes the public teacher page', async () => {
    const { queryClient, wrapper } = setup();
    const saved = { ...PROFILE, jobTitle: 'Lead' };
    mocked.updateProfile.mockResolvedValue(saved);
    queryClient.setQueryData(queryKeys.teacher('teacher-1'), { id: 'teacher-1' });
    const { result } = await renderHook(() => useUpdateTeacherProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ jobTitle: 'Lead' });
    });

    expect(queryClient.getQueryData(queryKeys.teachingProfile())).toEqual(saved);
    expect(queryClient.getQueryState(queryKeys.teacher('teacher-1'))?.isInvalidated).toBe(true);
  });
});

describe('useCourseStats', () => {
  it('loads the stats of the course', async () => {
    const stats = { courseId: 'c1', enrollmentCount: 3 };
    mocked.stats.mockResolvedValue(stats);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useCourseStats('c1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(stats));
    expect(mocked.stats).toHaveBeenCalledWith('c1');
  });
});

describe('usePinAnswer', () => {
  beforeEach(() => jest.clearAllMocks());

  function readIds(queryClient: TestClient) {
    return queryClient
      .getQueryData<InfiniteData<Paginated<AnswerDto>, number>>(queryKeys.questionAnswers('q1'))
      ?.pages[0]?.data.map((item) => [item.id, item.isPinned]);
  }

  it('pins right away (the previous pin is dropped) and calls PUT', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocked.pinAnswer.mockReturnValue(new Promise((done) => (resolve = done)));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(
      queryKeys.questionAnswers('q1'),
      pages([answer('a', true), answer('b')]),
    );
    const { result } = await renderHook(() => usePinAnswer('q1'), { wrapper });

    await act(async () => {
      result.current.mutate({ answerId: 'b', isPinned: false });
    });

    await waitFor(() =>
      expect(readIds(queryClient)).toEqual([
        ['b', true],
        ['a', false],
      ]),
    );
    expect(mocked.pinAnswer).toHaveBeenCalledWith('b');
    await act(async () => resolve(answer('b', true)));
  });

  it('unpins with DELETE', async () => {
    mocked.unpinAnswer.mockResolvedValue(answer('a'));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.questionAnswers('q1'), pages([answer('a', true)]));
    const { result } = await renderHook(() => usePinAnswer('q1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ answerId: 'a', isPinned: true });
    });

    expect(mocked.unpinAnswer).toHaveBeenCalledWith('a');
  });

  it('rolls the list back when the server refuses', async () => {
    mocked.pinAnswer.mockRejectedValue(
      new AppError({ status: 403, code: 'NOT_COURSE_TEACHER', message: 'no' }),
    );
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(
      queryKeys.questionAnswers('q1'),
      pages([answer('a', true), answer('b')]),
    );
    const { result } = await renderHook(() => usePinAnswer('q1'), { wrapper });

    await act(async () => {
      result.current.mutate({ answerId: 'b', isPinned: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readIds(queryClient)).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });
});

describe('review reply hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  function readReply(queryClient: TestClient) {
    return queryClient.getQueryData<InfiniteData<Paginated<ReviewDto>, number>>(
      queryKeys.courseReviews('c1', 'all'),
    )?.pages[0]?.data[0]?.teacherReply;
  }

  it('writes the saved reply into the cached review', async () => {
    mocked.replyToReview.mockResolvedValue(review('r1', 'Thanks!'));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.courseReviews('c1', 'all'), pages([review('r1')]));
    const { result } = await renderHook(() => useReplyToReview(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ reviewId: 'r1', reply: 'Thanks!' });
    });

    expect(mocked.replyToReview).toHaveBeenCalledWith('r1', { reply: 'Thanks!' });
    expect(readReply(queryClient)).toBe('Thanks!');
  });

  it('removes the reply at once and restores it when deleting fails', async () => {
    mocked.deleteReviewReply.mockRejectedValue(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(
      queryKeys.courseReviews('c1', 'all'),
      pages([review('r1', 'Thanks!')]),
    );
    const { result } = await renderHook(() => useDeleteReviewReply(), { wrapper });

    await act(async () => {
      result.current.mutate('r1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readReply(queryClient)).toBe('Thanks!');
  });

  it('keeps the reply removed when deleting succeeds', async () => {
    mocked.deleteReviewReply.mockResolvedValue(review('r1'));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(
      queryKeys.courseReviews('c1', 'all'),
      pages([review('r1', 'Thanks!')]),
    );
    const { result } = await renderHook(() => useDeleteReviewReply(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('r1');
    });

    expect(readReply(queryClient)).toBeNull();
  });
});
