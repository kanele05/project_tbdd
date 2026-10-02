import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { queryKeys } from '@/lib/queryKeys';

import { useCourseDetail, useEnrollFree, usePreviewLesson, useSimilarCourses } from './hooks';

const mockDetail = jest.fn();
const mockSimilar = jest.fn();
const mockEnroll = jest.fn();
const mockLesson = jest.fn();

jest.mock('./api', () => ({
  courseApi: {
    detail: (id: string) => mockDetail(id),
    similar: (id: string) => mockSimilar(id),
    enroll: (id: string) => mockEnroll(id),
    lesson: (id: string) => mockLesson(id),
  },
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, invalidate, wrapper };
}

describe('course hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCourseDetail and useSimilarCourses call the API and cache under the shared keys', async () => {
    mockDetail.mockResolvedValue({ id: 'c1' });
    mockSimilar.mockResolvedValue([{ id: 'c2' }]);
    const { queryClient, wrapper } = setup();

    const detail = await renderHook(() => useCourseDetail('c1'), { wrapper });
    const similar = await renderHook(() => useSimilarCourses('c1'), { wrapper });

    await waitFor(() => expect(detail.result.current.data).toEqual({ id: 'c1' }));
    await waitFor(() => expect(similar.result.current.data).toEqual([{ id: 'c2' }]));
    expect(queryClient.getQueryData(queryKeys.course('c1'))).toEqual({ id: 'c1' });
    expect(queryClient.getQueryData(queryKeys.courseSimilar('c1'))).toEqual([{ id: 'c2' }]);
  });

  it('usePreviewLesson stays idle without a lesson id and loads the lesson otherwise', async () => {
    mockLesson.mockResolvedValue({ id: 'l1', videoUrl: 'https://x/v.mp4' });
    const { wrapper } = setup();

    const idle = await renderHook(() => usePreviewLesson(null), { wrapper });
    expect(idle.result.current.fetchStatus).toBe('idle');
    expect(mockLesson).not.toHaveBeenCalled();

    const active = await renderHook(() => usePreviewLesson('l1'), { wrapper });
    await waitFor(() => expect(active.result.current.data?.videoUrl).toBe('https://x/v.mp4'));
    expect(mockLesson).toHaveBeenCalledWith('l1');
  });

  it('useEnrollFree refreshes the course, my courses, stats and home', async () => {
    mockEnroll.mockResolvedValue(undefined);
    const { invalidate, wrapper } = setup();
    const { result } = await renderHook(() => useEnrollFree(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('c1');
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockEnroll).toHaveBeenCalledWith('c1');
    const keys = invalidate.mock.calls.map(([f]) => (f as { queryKey: unknown[] }).queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.course('c1'),
        queryKeys.meCoursesAll(),
        queryKeys.meStats(),
        queryKeys.home(),
      ]),
    );
  });
});
