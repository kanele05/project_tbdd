import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { queryKeys } from '@/lib/queryKeys';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { CourseDetail, CurriculumSection, LessonDetail } from '@/types/api';

import { learningApi } from './api';
import { useActiveLesson, useCurriculum, useLesson, useShareCourse } from './hooks';

jest.mock('./api', () => ({
  learningApi: {
    curriculum: jest.fn(),
    lesson: jest.fn(),
    like: jest.fn(),
    unlike: jest.fn(),
    share: jest.fn(),
    saveProgress: jest.fn(),
  },
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ error: jest.fn(), success: jest.fn(), info: jest.fn() }),
}));

const mocked = learningApi as jest.Mocked<typeof learningApi>;

const SECTIONS = [
  { id: 's1', title: 'Intro', lessons: [{ id: 'l1' }, { id: 'l2' }] },
  { id: 's2', title: 'Next', lessons: [{ id: 'l3' }] },
] as unknown as CurriculumSection[];

function makeCourse(lastLessonId: string | null): CourseDetail {
  return { id: 'c1', shareCount: 2, enrollment: { lastLessonId } } as unknown as CourseDetail;
}

afterEach(async () => {
  await act(flushNotifications);
});

describe('useCurriculum', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the curriculum of a course', async () => {
    mocked.curriculum.mockResolvedValue(SECTIONS);
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useCurriculum('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(SECTIONS));
    expect(mocked.curriculum).toHaveBeenCalledWith('c1');
  });
});

describe('useLesson', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing while no lesson is selected', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useLesson(null), {
      wrapper: createQueryWrapper(client),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocked.lesson).not.toHaveBeenCalled();
  });

  it('fetches the lesson once a lesson id is known', async () => {
    mocked.lesson.mockResolvedValue({ id: 'l1', positionSec: 30 } as unknown as LessonDetail);
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useLesson('l1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.id).toBe('l1'));
    expect(mocked.lesson).toHaveBeenCalledWith('l1');
    expect(client.getQueryData(queryKeys.lesson('l1'))).toBeDefined();
  });
});

describe('useActiveLesson', () => {
  const curriculum = { data: SECTIONS };

  it('starts with the lessonId route param', async () => {
    const { result } = await renderHook(() =>
      useActiveLesson({
        paramLessonId: 'l2',
        course: { data: makeCourse('l3'), isFetching: false },
        curriculum,
      }),
    );
    expect(result.current.activeLessonId).toBe('l2');
  });

  it('resumes the enrollment lastLessonId when there is no param', async () => {
    const { result } = await renderHook(() =>
      useActiveLesson({
        paramLessonId: undefined,
        course: { data: makeCourse('l3'), isFetching: false },
        curriculum,
      }),
    );
    expect(result.current.activeLessonId).toBe('l3');
  });

  it('falls back to the first lesson when nothing was watched yet', async () => {
    const { result } = await renderHook(() =>
      useActiveLesson({
        paramLessonId: undefined,
        course: { data: makeCourse(null), isFetching: false },
        curriculum,
      }),
    );
    expect(result.current.activeLessonId).toBe('l1');
  });

  it('waits for the course to settle so a stale lastLessonId is not resumed', async () => {
    const { result } = await renderHook(() =>
      useActiveLesson({
        paramLessonId: undefined,
        course: { data: makeCourse('l3'), isFetching: true },
        curriculum,
      }),
    );
    expect(result.current.activeLessonId).toBeNull();
  });

  it('does not switch lessons again after the user picked one', async () => {
    const { result, rerender } = await renderHook(
      (props: { lastLessonId: string | null }) =>
        useActiveLesson({
          paramLessonId: undefined,
          course: { data: makeCourse(props.lastLessonId), isFetching: false },
          curriculum,
        }),
      { initialProps: { lastLessonId: 'l1' as string | null } },
    );
    expect(result.current.activeLessonId).toBe('l1');

    await act(async () => result.current.selectLesson('l2'));
    await rerender({ lastLessonId: 'l3' });

    expect(result.current.activeLessonId).toBe('l2');
  });

  it('follows a new route param', async () => {
    const { result, rerender } = await renderHook(
      (props: { param: string | undefined }) =>
        useActiveLesson({
          paramLessonId: props.param,
          course: { data: makeCourse(null), isFetching: false },
          curriculum,
        }),
      { initialProps: { param: 'l1' as string | undefined } },
    );
    await rerender({ param: 'l3' });
    expect(result.current.activeLessonId).toBe('l3');
  });
});

describe('useShareCourse', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('does not open the share sheet without a course title', async () => {
    const share = jest.spyOn(Share, 'share');
    const { result } = await renderHook(() => useShareCourse('c1', undefined), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await act(async () => result.current.share());
    expect(share).not.toHaveBeenCalled();
  });

  it('counts the share on the server and updates shareCount after a real share', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mocked.share.mockResolvedValue({ shareCount: 3 });
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.course('c1'), makeCourse(null));
    const { result } = await renderHook(() => useShareCourse('c1', 'PHP in One Click'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.share();
      await flushNotifications();
    });

    await waitFor(() =>
      expect(client.getQueryData<CourseDetail>(queryKeys.course('c1'))?.shareCount).toBe(3),
    );
    expect(mocked.share).toHaveBeenCalledTimes(1);
  });

  it('does not count a share the user dismissed', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    const { result } = await renderHook(() => useShareCourse('c1', 'PHP in One Click'), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await act(async () => {
      await result.current.share();
      await flushNotifications();
    });

    expect(mocked.share).not.toHaveBeenCalled();
  });

  it('swallows a failing share sheet', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no activity'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderHook(() => useShareCourse('c1', 'PHP in One Click'), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await act(async () => result.current.share());
    expect(mocked.share).not.toHaveBeenCalled();
  });
});
