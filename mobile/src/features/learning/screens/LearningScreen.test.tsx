import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Keyboard, useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { CourseDetail, CurriculumSection, LessonDetail } from '@/types/api';

import { LearningScreen } from './LearningScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockToggleLike = jest.fn();
const mockShare = jest.fn();
const mockToggleBookmark = jest.fn();
const mockRefetchLesson = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockCourse: Record<string, unknown> = {};
let mockCurriculum: Record<string, unknown> = {};
let mockLessons: Record<string, Record<string, unknown>> = {};
let mockOnEnded: ((nextLessonId: string | null) => void) | undefined;
let mockPlayerMounts = 0;

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
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
    jest.requireActual('react').useEffect(() => {
      mockPlayerMounts += 1;
    }, []);
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

const mockWindow = useWindowDimensions as jest.Mock;
const PHONE = { width: 390, height: 844, scale: 1, fontScale: 1 };
const DESKTOP = { width: 1280, height: 800, scale: 1, fontScale: 1 };

const COURSE: CourseDetail = {
  id: 'course-1',
  status: 'PUBLISHED',
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
    mockWindow.mockReturnValue(PHONE);
    mockPlayerMounts = 0;
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
    expect(screen.getByText('231 Likes')).toBeOnTheScreen();
    expect(screen.getByText('16 Shares')).toBeOnTheScreen();
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

  it('opens the Projects tab when the tab param says so (PROJECT_GRADED notification)', async () => {
    mockParams = { tab: 'projects' };

    await renderScreen();

    expect(screen.getByText('projects course-1')).toBeOnTheScreen();
  });

  it('ignores an unknown tab param', async () => {
    mockParams = { tab: 'nope' };

    await renderScreen();

    expect(screen.getByText('I - Introduction')).toBeOnTheScreen();
  });

  it('switches between the LESSONS, PROJECTS and Q&A tabs', async () => {
    await renderScreen();
    expect(screen.getByText('I - Introduction')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Projects' }));
    expect(screen.getByText('projects course-1')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));
    expect(screen.getByText('qa course-1')).toBeOnTheScreen();
  });

  it('opens the AI panel with the Lessons tab only, naming the lesson that plays', async () => {
    await renderScreen();

    expect(screen.getByTestId('lesson-ai-panel')).toBeOnTheScreen();
    expect(screen.getByText('Currently: lesson-2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Projects' }));
    expect(screen.queryByTestId('lesson-ai-panel')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));
    expect(screen.queryByTestId('lesson-ai-panel')).not.toBeOnTheScreen();
  });

  it('opens the quiz of the lesson that is playing', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('open-quiz'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]/quiz',
      params: { courseId: 'course-1', lessonId: 'lesson-2' },
    });
  });

  it('reaches the AI Tutor from the header on every tab', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));

    await fireEvent.press(screen.getByTestId('header-ask-tutor'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]/tutor',
      params: { courseId: 'course-1' },
    });
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

  describe('small screens: the video folds while typing', () => {
    const handlers: Record<string, () => void> = {};
    const showKeyboard = () => act(async () => void handlers.keyboardDidShow?.());
    const hideKeyboard = () => act(async () => void handlers.keyboardDidHide?.());

    beforeEach(() => {
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((
        event: string,
        handler: () => void,
      ) => {
        handlers[event] = handler;
        return { remove: jest.fn() };
      }) as never);
    });
    afterEach(() => jest.restoreAllMocks());

    it('shows a mini bar and keeps the player mounted when the keyboard opens on the Q&A tab', async () => {
      await renderScreen();
      await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));
      expect(screen.queryByTestId('mini-player-bar')).not.toBeOnTheScreen();

      await showKeyboard();

      expect(screen.getByTestId('mini-player-bar')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Show video' })).toBeOnTheScreen();
      // Still mounted (playback is not lost), only hidden from the screen reader.
      expect(
        screen.getByText('playing lesson-2', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(screen.queryByText('playing lesson-2')).not.toBeOnTheScreen();

      await hideKeyboard();

      expect(screen.queryByTestId('mini-player-bar')).not.toBeOnTheScreen();
      expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();
    });

    it('dismisses the keyboard when the mini bar is pressed', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
      await renderScreen();
      await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));
      await showKeyboard();

      await fireEvent.press(screen.getByTestId('mini-player-bar'));

      expect(dismiss).toHaveBeenCalledTimes(1);
      dismiss.mockRestore();
    });

    it('never folds the video on the Lessons tab', async () => {
      await renderScreen();

      await showKeyboard();

      expect(screen.queryByTestId('mini-player-bar')).not.toBeOnTheScreen();
      expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();
    });
  });

  describe('PC window (>= 768 dp)', () => {
    beforeEach(() => mockWindow.mockReturnValue(DESKTOP));

    it('puts the lesson title and the course info under the player and the tabs in a side panel', async () => {
      await renderScreen();

      const info = screen.getByTestId('desktop-lesson-info');
      expect(info).toBeOnTheScreen();
      expect(screen.getByText('231 Likes')).toBeOnTheScreen();
      expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();
      expect(screen.getByRole('tab', { name: 'Lessons' })).toBeOnTheScreen();
      expect(screen.getByText('First lesson')).toBeOnTheScreen();
    });

    it('shows the course title once, not again above the tabs', async () => {
      await renderScreen();

      expect(
        screen.getAllByText('UX Foundation: Introduction to User Experience Design'),
      ).toHaveLength(1);
    });

    it('never folds the video into the mini bar while typing', async () => {
      const handlers: Record<string, () => void> = {};
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((
        event: string,
        handler: () => void,
      ) => {
        handlers[event] = handler;
        return { remove: jest.fn() };
      }) as never);
      await renderScreen();
      await fireEvent.press(screen.getByRole('tab', { name: 'Q&A' }));

      await act(async () => void handlers.keyboardDidShow?.());

      expect(screen.queryByTestId('mini-player-bar')).not.toBeOnTheScreen();
      expect(screen.getByText('playing lesson-2')).toBeOnTheScreen();
      jest.restoreAllMocks();
    });

    it('keeps the same player mounted when the window is resized between phone and PC', async () => {
      mockWindow.mockReturnValue(PHONE);
      const { rerender } = await renderScreen();
      expect(screen.queryByTestId('desktop-lesson-info')).not.toBeOnTheScreen();
      expect(mockPlayerMounts).toBe(1);

      mockWindow.mockReturnValue(DESKTOP);
      await rerender(
        <ToastProvider>
          <LearningScreen courseId="course-1" />
        </ToastProvider>,
      );

      expect(screen.getByTestId('desktop-lesson-info')).toBeOnTheScreen();
      expect(mockPlayerMounts).toBe(1);
    });
  });
});
