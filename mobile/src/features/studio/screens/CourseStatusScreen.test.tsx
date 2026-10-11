import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { StudioCourseDetailDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { makeDetail, makeRevision } from '../studioFixtures';
import { CourseStatusScreen } from './CourseStatusScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockWorkflow = jest.fn();
const mockDiscard = jest.fn();
const mockRemove = jest.fn();
const mockRefetch = jest.fn();
let mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

jest.mock('../hooks', () => ({
  useStudioCourse: () => mockQuery,
  useCourseWorkflow: () => ({ mutateAsync: mockWorkflow, isPending: false }),
  useDiscardRevision: () => ({ mutateAsync: mockDiscard, isPending: false }),
  useDeleteCourse: () => ({ mutateAsync: mockRemove, isPending: false }),
}));

const confirm = jest.mocked(confirmAction);

function setDetail(detail: StudioCourseDetailDto) {
  mockQuery = {
    data: detail,
    isPending: false,
    isError: false,
    isRefetching: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
  };
}

describe('CourseStatusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirm.mockResolvedValue(true);
    mockWorkflow.mockResolvedValue(undefined);
    mockDiscard.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  it('shows a skeleton while loading and an error with Retry', async () => {
    mockQuery = { isPending: true, isError: false, fetchStatus: 'fetching', refetch: mockRefetch };
    const { unmount } = await renderWithProviders(<CourseStatusScreen courseId="course-1" />);
    expect(screen.getByTestId('status-skeleton')).toBeOnTheScreen();
    unmount();

    mockQuery = {
      isPending: false,
      isError: true,
      error: new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'x' }),
      fetchStatus: 'idle',
      refetch: mockRefetch,
    };
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);
    expect(screen.getByText('This course could not be found.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('lists what is missing as readable sentences and keeps Submit disabled', async () => {
    setDetail(
      makeDetail({
        missing: [
          { code: 'NO_THUMBNAIL' },
          { code: 'LESSON_VIDEO_INVALID', lessonNumber: 2 },
          { code: 'NOT_ENOUGH_LESSONS' },
        ],
      }),
    );
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByText('Upload a cover image.')).toBeOnTheScreen();
    expect(screen.getByText('Lesson 2 needs a valid YouTube link.')).toBeOnTheScreen();
    expect(screen.getByText('3 things left to fix before you can submit:')).toBeOnTheScreen();
    expect(screen.getByTestId('status-submit')).toBeDisabled();

    await fireEvent.press(screen.getByText('Upload a cover image.'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/studio/[id]/edit',
      params: { id: 'course-1' },
    });
    await fireEvent.press(screen.getByText('Add at least 3 lessons in total.'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/studio/[id]/curriculum',
      params: { id: 'course-1' },
    });
  });

  it('submits a complete draft', async () => {
    setDetail(makeDetail());
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByTestId('status-ready')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('status-submit'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('submit'));
  });

  it('shows the server checklist when the submit comes back as COURSE_INCOMPLETE', async () => {
    setDetail(makeDetail());
    mockWorkflow.mockRejectedValue(
      new AppError({
        status: 422,
        code: 'COURSE_INCOMPLETE',
        message: 'x',
        details: { missing: [{ code: 'PREVIEW_COUNT' }] },
      }),
    );
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('status-submit'));
    expect(await screen.findByText('Mark 1 to 3 lessons as free previews.')).toBeOnTheScreen();
    expect(screen.getByText(/isn't ready to submit yet/)).toBeOnTheScreen();
  });

  it('shows the rejection reason of a rejected course and lets the teacher resubmit', async () => {
    setDetail(makeDetail({ status: 'REJECTED', rejectionReason: 'Video 2 is private' }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByTestId('status-rejection')).toHaveTextContent(/Video 2 is private/);
    expect(screen.getByText('Submit again')).toBeOnTheScreen();
  });

  it('asks before withdrawing a course that is in review', async () => {
    setDetail(makeDetail({ status: 'PENDING_REVIEW' }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('status-withdraw'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('withdraw'));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: 'Withdraw' }));
  });

  it('does nothing when the confirmation is declined', async () => {
    confirm.mockResolvedValue(false);
    setDetail(makeDetail({ status: 'PUBLISHED' }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('status-archive'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mockWorkflow).not.toHaveBeenCalled();
  });

  it('hides, restores and deletes', async () => {
    setDetail(makeDetail({ status: 'PUBLISHED', publishedAt: '2026-10-03T00:00:00.000Z' }));
    const published = await renderWithProviders(<CourseStatusScreen courseId="course-1" />);
    await fireEvent.press(screen.getByTestId('status-archive'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('archive'));
    published.unmount();

    setDetail(makeDetail({ status: 'ARCHIVED' }));
    const archived = await renderWithProviders(<CourseStatusScreen courseId="course-1" />);
    await fireEvent.press(screen.getByTestId('status-restore'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('restore'));
    archived.unmount();

    setDetail(makeDetail());
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);
    await fireEvent.press(screen.getByTestId('status-delete'));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('course-1'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/studio');
  });

  it('offers to create a revision of a published course', async () => {
    setDetail(makeDetail({ status: 'PUBLISHED' }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByTestId('revision-none')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('revision-start'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('createRevision'));
  });

  it('lets the teacher submit, continue or discard an open revision', async () => {
    const revision = makeRevision('OPEN');
    setDetail(makeDetail({ status: 'PUBLISHED', revision }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('revision-submit'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('submitRevision'));
    await fireEvent.press(screen.getAllByText('Edit curriculum')[0] as never);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/studio/[id]/curriculum',
      params: { id: 'course-1' },
    });
    await fireEvent.press(screen.getByTestId('revision-discard'));
    await waitFor(() => expect(mockDiscard).toHaveBeenCalled());
  });

  it('blocks submitting a revision that has open items and shows the rejection of a revision', async () => {
    const revision = {
      ...makeRevision('REJECTED'),
      missing: [{ code: 'NO_SECTION' as const }],
      rejectionReason: 'Prices look wrong',
    };
    setDetail(makeDetail({ status: 'PUBLISHED', revision }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByTestId('revision-rejection')).toHaveTextContent(/Prices look wrong/);
    expect(screen.getByText('Add at least one section.')).toBeOnTheScreen();
    expect(screen.getByTestId('revision-submit')).toBeDisabled();
  });

  it('shows the review history with who, when and why', async () => {
    setDetail(
      makeDetail({
        status: 'REJECTED',
        moderation: [
          {
            id: 'm2',
            action: 'REJECTED',
            target: 'COURSE',
            reason: 'Needs a better description',
            createdAt: '2026-10-04T09:00:00.000Z',
            actor: { id: 'a1', fullName: 'Admin Ada', role: 'ADMIN' },
          },
          {
            id: 'm1',
            action: 'SUBMITTED',
            target: 'COURSE',
            reason: null,
            createdAt: '2026-10-03T09:00:00.000Z',
            actor: { id: 't1', fullName: 'Teacher Tom', role: 'TEACHER' },
          },
        ],
      }),
    );
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    expect(screen.getByText('Rejected (course)')).toBeOnTheScreen();
    expect(screen.getByText('Reason: Needs a better description')).toBeOnTheScreen();
    expect(screen.getByText(/^Admin Ada - /)).toBeOnTheScreen();
    expect(screen.getByText('Submitted for review (course)')).toBeOnTheScreen();
  });

  it('links to stats and submissions once the course has been published', async () => {
    setDetail(makeDetail({ status: 'PUBLISHED', publishedAt: '2026-10-03T00:00:00.000Z' }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

    await fireEvent.press(screen.getByText('Statistics'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/studio/[id]/stats',
      params: { id: 'course-1' },
    });
    await fireEvent.press(screen.getByText('Project submissions'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/studio/[id]/submissions',
      params: { id: 'course-1' },
    });
  });

  it('hides the stats links for a draft and renders in Vietnamese', async () => {
    setDetail(makeDetail({ missing: [{ code: 'NO_CATEGORY' }] }));
    await renderWithProviders(<CourseStatusScreen courseId="course-1" />, {
      language: 'vi',
      theme: 'dark',
    });

    expect(screen.queryByText('Thống kê')).not.toBeOnTheScreen();
    expect(screen.getByText('Hãy chọn danh mục.')).toBeOnTheScreen();
    expect(screen.getByText('Trạng thái khóa học')).toBeOnTheScreen();
  });
});
