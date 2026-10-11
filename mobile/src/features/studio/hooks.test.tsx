import { act, renderHook, waitFor } from '@testing-library/react-native';

import { queryKeys } from '@/lib/queryKeys';
import {
  createQueryWrapper,
  createTestQueryClient,
  flushNotifications,
  makePage,
} from '@/test/queryWrapper';

import { studioApi } from './api';
import {
  useCourseWorkflow,
  useCurriculumMutations,
  useStudioCourse,
  useStudioCourses,
} from './hooks';
import { makeDetail, makeSection, makeSummary } from './studioFixtures';

jest.mock('./api', () => ({
  STUDIO_PAGE_SIZE: 20,
  studioApi: {
    list: jest.fn(),
    detail: jest.fn(),
    archive: jest.fn(),
    submit: jest.fn(),
    reorder: jest.fn(),
    addSection: jest.fn(),
  },
}));

const api = jest.mocked(studioApi);
const SUMMARY = {
  courseCount: 1,
  totalEnrollments: 0,
  totalRevenueCents: 0,
  byStatus: {} as never,
};

afterEach(async () => {
  await act(flushNotifications);
});

describe('useStudioCourses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flattens the pages and exposes the summary of the first one', async () => {
    api.list.mockResolvedValue({
      ...makePage([makeSummary()], 1, 2),
      meta: { ...makePage([]).meta, page: 1, totalPages: 2, summary: SUMMARY },
    });
    const { result } = await renderHook(() => ({ ...useStudioCourses('DRAFT') }), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.courses).toHaveLength(1));
    expect(result.current.summary).toEqual(SUMMARY);
    expect(result.current.hasNextPage).toBe(true);
    expect(api.list).toHaveBeenCalledWith({ page: 1, status: 'DRAFT' });
  });

  it('does not send a status filter for "all"', async () => {
    api.list.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1, summary: SUMMARY },
    });
    const { result } = await renderHook(() => ({ ...useStudioCourses('all') }), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.list).toHaveBeenCalledWith({ page: 1 });
  });
});

describe('useStudioCourse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is disabled without an id and loads the detail with one', async () => {
    const wrapper = createQueryWrapper(createTestQueryClient());
    await renderHook(() => ({ ...useStudioCourse(undefined) }), { wrapper });
    expect(api.detail).not.toHaveBeenCalled();

    api.detail.mockResolvedValue(makeDetail());
    const { result } = await renderHook(() => ({ ...useStudioCourse('course-1') }), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe('course-1'));
  });
});

describe('useCourseWorkflow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes the answer to the detail cache and refreshes the lists and the catalog on archive', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    api.archive.mockResolvedValue(makeDetail({ status: 'ARCHIVED' }));
    const { result } = await renderHook(() => ({ ...useCourseWorkflow('course-1') }), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('archive');
    });

    expect(
      client.getQueryData<{ status: string }>(queryKeys.studioCourse('course-1'))?.status,
    ).toBe('ARCHIVED');
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.studioCoursesAll(),
        queryKeys.home(),
        queryKeys.coursesAll(),
        queryKeys.course('course-1'),
      ]),
    );
  });

  it('does not touch the public catalog when a course is only submitted', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    api.submit.mockResolvedValue(makeDetail({ status: 'PENDING_REVIEW' }));
    const { result } = await renderHook(() => ({ ...useCourseWorkflow('course-1') }), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync('submit');
    });

    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).not.toContainEqual(queryKeys.home());
  });
});

describe('useCurriculumMutations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('puts the reordered curriculum straight into the cached detail', async () => {
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.studioCourse('course-1'), makeDetail());
    const reordered = [makeSection({ id: 'section-9', title: 'Moved' })];
    api.reorder.mockResolvedValue(reordered);
    const { result } = await renderHook(() => ({ ...useCurriculumMutations('course-1') }), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.reorder.mutateAsync({ target: 'sections', ids: ['section-9'] });
    });

    expect(api.reorder).toHaveBeenCalledWith('course-1', {
      target: 'sections',
      ids: ['section-9'],
    });
    expect(
      client.getQueryData<{ sections: { id: string }[] }>(queryKeys.studioCourse('course-1'))
        ?.sections,
    ).toEqual(reordered);
  });

  it('refreshes the course after adding a section', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    api.addSection.mockResolvedValue(makeSection());
    const { result } = await renderHook(() => ({ ...useCurriculumMutations('course-1') }), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.addSection.mutateAsync({ title: 'S' });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.studioCourse('course-1') });
  });
});
