import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { CourseDetail, CurriculumSection, LessonDetail } from '@/types/api';

import { LearningScreen } from './LearningScreen';

const mockReplace = jest.fn();
const mockToggleLike = jest.fn();
const mockShare = jest.fn();
const mockToggleBookmark = jest.fn();
const mockRefetchLesson = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockCourse: Record<string, unknown> = {};
let mockCurriculum: Record<string, unknown> = {};
let mockLessons: Record<string, Record<string, unknown>> = {};
let mockOnEnded: ((nextLessonId: string | null) => void) | undefined;

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/features/course/hooks', () => ({ useCourseDetail: () => mockCourse }));

jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));

jest.mock('@/features/project/components/ProjectsTab', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    ProjectsTab: ({ courseId }: { courseId: string }) => (
      <MockText>{`projects ${courseId}`}</MockText>
    ),
  };
});

jest.mock('@/features/qa/components/QaTab', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { QaTab: ({ courseId }: { courseId: string }) => <MockText>{`qa ${courseId}`}</MockText> };
});

jest.mock('../components/LessonPlayer', () => ({
  LessonPlayer: ({
    lesson,
    onEnded,
  }: {
    lesson: { id: string };
    onEnded: (nextLessonId: string | null) => void;
  }) => {
    mockOnEnded = onEnded;
    const { Text: MockText } = jest.requireActual('react-native');
    return <MockText>{`playing ${lesson.id}`}</MockText>;
  },
}));

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useCurriculum: () => mockCurriculum,
  useLesson: (lessonId: string | null) =>
    lessonId
      ? (mockLessons[lessonId] ?? { isPending: true, fetchStatus: 'fetching' })
      : {
          isPending: false,
          isSuccess: false,
          isError: false,
          isFetching: false,
          fetchStatus: 'idle',
        },
  useToggleCourseLike: () => ({ mutate: mockToggleLike }),
  useShareCourse: () => ({ share: mockShare }),
}));

const COURSE: CourseDetail = {
  id: 'course-1',
  title: 'UX Foundation: Introduction to User Experience Design',
  thumbnailUrl: 'https://example.com/a.png',
  teacher: {
    id: 't1',
    fullName: 'Teacher',
    avatarUrl: null,
    jobTitle: 'Designer',
    isFollowed: false,
  },
  priceCents: 0,
  originalPriceCents: null,
  badge: null,
  discountPercent: null,
  ratingAvg: 4.5,
  ratingCount: 10,
  lessonCount: 3,
  totalDurationSec: 300,
  isBookmarked: false,
  subtitle: null,
  description: 'd',
  bannerUrl: null,
  benefits: [],
  likeCount: 231,
  shareCount: 16,
  isLiked: false,
  category: { id: 'c', name: 'Design' },
  enrollment: { progressPercent: 30, lastLessonId: 'lesson-2' },
  isInCart: false,
  previewLessonId: null,
} as CourseDetail;

const SECTIONS: CurriculumSection[] = [
  {
    id: 's1',
    title: 'I - Introduction',
    order: 1,
    lessons: [
      {
        id: 'lesson-1',
        number: 1,
        title: 'First lesson',
        durationSec: 100,
        isPreview: true,
        status: 'COMPLETED',
      },
      {
        id: 'lesson-2',
        number: 2,
        title: 'Second lesson',
        durationSec: 100,
        isPreview: false,
        status: 'IN_PROGRESS',
      },
      {
        id: 'lesson-3',
        number: 3,
        title: 'Third lesson',
        durationSec: 100,
        isPreview: false,
        status: 'UNLOCKED',
      },
    ],
  },
];

function lessonState(id: string, nextLessonId: string | null = null) {
  const data: LessonDetail = {
    id,
    courseId: 'course-1',
    title: id,
    durationSec: 100,
    videoUrl: 'https://example.com/v.mp4',
    positionSec: 0,
    isCompleted: false,
    nextLessonId,
  };
  return {
    data,
    isSuccess: true,
    isPending: false,
    isError: false,
    isFetching: false,
    fetchStatus: 'idle',
    error: null,
    refetch: mockRefetchLesson,
  };
}

function curriculumState(overrides: Record<string, unknown> = {}) {
  return {
    data: SECTIONS,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: jest.fn(),
    ...overrides,
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <LearningScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('LearningScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockOnEnded = undefined;
    mockCourse = {
      data: COURSE,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchStatus: 'idle',
      isPending: false,
    };
    mockCurriculum = curriculumState();
    mockLessons = {
      'lesson-1': lessonState('lesson-1', 'lesson-2'),
      'lesson-2': lessonState('lesson-2', 'lesson-3'),
      'lesson-3': lessonState('lesson-3'),
    };
  });

  it('plays the lesson of the lessonId param', async () => {
    mockParams = { lessonId: 'lesson-3' };

    await renderScreen();

    expect(screen.getByText('playing lesson-3')).toBeOnTheScreen();
  });

  it('continues at the last lesson of the enrollment without a param', async () => {
    await renderScreen();

    expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();
  });

  it('falls back to the first lesson when nothing was started', async () => {
    mockCourse = {
      ...mockCourse,
      data: { ...COURSE, enrollment: { progressPercent: 0, lastLessonId: null } },
    };

    await renderScreen();

    expect(screen.getByText('playing lesson-1')).toBeOnTheScreen();
  });

  it('waits for a settled course before choosing the lesson (a stale lastLessonId would resume the wrong one)', async () => {
    mockCourse = { ...mockCourse, isFetching: true };

    await renderScreen();

    expect(screen.queryByText(/^playing/)).not.toBeOnTheScreen();
    expect(screen.getByTestId('player-placeholder')).toBeOnTheScreen();
  });

  it('shows the short course title, the full title and the like and share counts', async () => {
    await renderScreen();

    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(
      screen.getByText('UX Foundation: Introduction to User Experience Design'),
    ).toBeOnTheScreen();
    expect(screen.getByText('231 Like')).toBeOnTheScreen();
    expect(screen.getByText('16 Share')).toBeOnTheScreen();
  });

  it('highlights the playing lesson in the Lessons tab and switches lesson on press', async () => {
    await renderScreen();
    expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('lesson-row-lesson-3'));

    expect(screen.getByText('playing lesson-3')).toBeOnTheScreen();
  });

  it('moves on to the next lesson when the video ends', async () => {
    await renderScreen();

    await act(async () => mockOnEnded?.('lesson-3'));

    await waitFor(() => expect(screen.getByText('playing lesson-3')).toBeOnTheScreen());
  });

  it('stays on the last lesson when the video ends and there is no next one', async () => {
    mockParams = { lessonId: 'lesson-3' };
    await renderScreen();

    await act(async () => mockOnEnded?.(null));

    expect(screen.getByText('playing lesson-3')).toBeOnTheScreen();
  });

  it('toggles like with the current state', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('course-like'));

    expect(mockToggleLike).toHaveBeenCalledWith(false);
  });

  it('opens the share sheet', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('course-share'));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('toggles the bookmark from the header', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Save course' }));

    expect(mockToggleBookmark).toHaveBeenCalledWith('course-1', false);
  });

  it('switches between the LESSONS, PROJECTS and Q&A tabs', async () => {
    await renderScreen();
    expect(screen.getByText('I - Introduction')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Projects' }));
    expect(screen.getByText('projects course-1')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));
    expect(screen.getByText('qa course-1')).toBeOnTheScreen();
  });

  it('goes back to the course details with a message when the lesson answers 403', async () => {
    mockLessons['lesson-2'] = {
      isPending: false,
      isSuccess: false,
      isError: true,
      isFetching: false,
      fetchStatus: 'idle',
      error: new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'no' }),
      refetch: mockRefetchLesson,
    };

    await renderScreen();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/course/[id]',
        params: { id: 'course-1' },
      }),
    );
  });

  it('shows an offline message in the video slot instead of an endless spinner', async () => {
    mockLessons['lesson-2'] = {
      isPending: true,
      isSuccess: false,
      isError: false,
      isFetching: false,
      fetchStatus: 'paused',
      refetch: mockRefetchLesson,
    };

    await renderScreen();

    expect(screen.getByText('Connect to the internet to watch this lesson.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetchLesson).toHaveBeenCalledTimes(1);
  });

  it('shows the error of a lesson that failed to load with Retry', async () => {
    mockLessons['lesson-2'] = {
      isPending: false,
      isSuccess: false,
      isError: true,
      isFetching: false,
      fetchStatus: 'idle',
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
      refetch: mockRefetchLesson,
    };

    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetchLesson).toHaveBeenCalledTimes(1);
  });

  it('shows skeletons for the lesson list while it loads', async () => {
    mockCurriculum = curriculumState({ data: undefined, isPending: true, fetchStatus: 'fetching' });

    await renderScreen();

    expect(screen.getByLabelText('Loading lessons')).toBeOnTheScreen();
  });
});
