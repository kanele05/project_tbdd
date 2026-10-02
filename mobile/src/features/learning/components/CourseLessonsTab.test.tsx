import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { CourseDetail, CurriculumSection } from '@/types/api';

import { CourseLessonsTab } from './CourseLessonsTab';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
let mockCurriculum: Record<string, unknown> = {};
let mockCourse: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../hooks', () => ({
  useCurriculum: () => mockCurriculum,
}));

jest.mock('@/features/course/hooks', () => ({
  useCourseDetail: () => mockCourse,
}));

function makeSections(): CurriculumSection[] {
  return [
    {
      id: 'section-1',
      title: 'I - Introduction',
      order: 1,
      lessons: [
        {
          id: 'preview-1',
          number: 1,
          title: 'Free preview lesson',
          durationSec: 83,
          isPreview: true,
          status: 'UNLOCKED',
        },
        {
          id: 'locked-1',
          number: 2,
          title: 'Paid lesson',
          durationSec: 83,
          isPreview: false,
          status: 'LOCKED',
        },
      ],
    },
  ];
}

function setCurriculum(overrides: Record<string, unknown>) {
  mockCurriculum = {
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
    ...overrides,
  };
}

function setCourse(enrollment: CourseDetail['enrollment'] | undefined) {
  mockCourse = { data: enrollment === undefined ? undefined : { enrollment } };
}

async function renderTab(onPlayPreview?: (lessonId: string) => void) {
  return render(
    <ToastProvider>
      <CourseLessonsTab courseId="course-1" onPlayPreview={onPlayPreview} />
    </ToastProvider>,
  );
}

describe('CourseLessonsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCourse(null);
    setCurriculum({ data: makeSections() });
  });

  it('shows the "Enroll to unlock this lesson" toast when a locked lesson is pressed', async () => {
    await renderTab();

    await fireEvent.press(screen.getByTestId('lesson-row-locked-1'));

    expect(await screen.findByText('Enroll to unlock this lesson')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('plays the preview through the parent when the user is not enrolled', async () => {
    const onPlayPreview = jest.fn();
    await renderTab(onPlayPreview);

    await fireEvent.press(screen.getByTestId('lesson-row-preview-1'));

    expect(onPlayPreview).toHaveBeenCalledWith('preview-1');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the Learning screen at the lesson when the user is enrolled', async () => {
    setCourse({ progressPercent: 30, lastLessonId: 'preview-1' });
    const onPlayPreview = jest.fn();
    await renderTab(onPlayPreview);

    await fireEvent.press(screen.getByTestId('lesson-row-preview-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-1', lessonId: 'preview-1' },
    });
    expect(onPlayPreview).not.toHaveBeenCalled();
  });

  it('treats a curriculum without locked lessons as enrolled until the course loads', async () => {
    setCourse(undefined);
    const sections = makeSections();
    const locked = sections[0]?.lessons[1];
    if (locked) locked.status = 'UNLOCKED';
    setCurriculum({ data: sections });
    await renderTab();

    await fireEvent.press(screen.getByTestId('lesson-row-locked-1'));

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('shows a skeleton while loading', async () => {
    setCurriculum({ isPending: true, fetchStatus: 'fetching' });
    await renderTab();

    expect(screen.getByLabelText('Loading lessons')).toBeOnTheScreen();
  });

  it('shows the offline state instead of an endless skeleton when paused without data', async () => {
    setCurriculum({ isPending: true, fetchStatus: 'paused' });
    await renderTab();

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows an error with a Retry button when the request fails', async () => {
    setCurriculum({
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await renderTab();

    expect(screen.getByText("Couldn't load the lessons")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the course has no lesson', async () => {
    setCurriculum({ data: [] });
    await renderTab();

    expect(screen.getByText('No lessons yet')).toBeOnTheScreen();
  });
});
