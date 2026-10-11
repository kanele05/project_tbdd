import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { AppError } from '@/lib/appError';
import type { MyCourseItem } from '@/types/api';

import { MyCoursesScreen } from './MyCoursesScreen';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockRefetch = jest.fn();
let mockResult: Record<string, unknown> = {};
let mockStatsResult: Record<string, unknown> = {};

jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      navigate: (...args: unknown[]) => mockNavigate(...args),
      setParams: (...args: unknown[]) => mockSetParams(...args),
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: () => true,
    },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (callback: () => void) => {
      useEffect(() => callback(), [callback]);
    },
  };
});
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('../hooks', () => ({ useMyCourses: () => mockResult }));
jest.mock('@/features/profile/hooks', () => ({ useMeStats: () => mockStatsResult }));
jest.mock('@/features/learning/progressSync', () => ({ startPendingProgressSync: jest.fn() }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const ITEMS: MyCourseItem[] = [
  {
    course: { id: 'course-1', title: 'UX Foundation', thumbnailUrl: 'https://example.com/1.png' },
    totalDurationSec: 8700,
    progressPercent: 30,
    lastLessonId: 'lesson-7',
    lastAccessedAt: '2026-10-01T10:00:00.000Z',
    lessonCount: 10,
    completedLessonCount: 3,
    lastLesson: { id: 'lesson-7', title: 'Wireframes', number: 4 },
  },
  {
    course: { id: 'course-2', title: 'Creative Art', thumbnailUrl: 'https://example.com/2.png' },
    totalDurationSec: 12300,
    progressPercent: 100,
    lastLessonId: null,
    lastAccessedAt: '2026-09-30T10:00:00.000Z',
    lessonCount: 12,
    completedLessonCount: 12,
    lastLesson: null,
  },
];

function setResult(overrides: Record<string, unknown>) {
  mockResult = {
    data: ITEMS,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
    ...overrides,
  };
}

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('MyCoursesScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    mockRefetch.mockResolvedValue(undefined);
    setResult({});
    mockStatsResult = {
      data: { savedCount: 2, ongoingCount: 5, completedCount: 3, learningSec: 22800 },
      isPending: false,
    };
  });

  it('lists every course as a card in a grid, with the tabs and the career banner', async () => {
    await render(<MyCoursesScreen />);

    expect(screen.getByRole('header', { name: 'My Courses' })).toBeOnTheScreen();
    expect(screen.getByTestId('my-courses-grid')).toBeOnTheScreen();
    expect(screen.getByTestId('my-course-course-1')).toBeOnTheScreen();
    expect(screen.getByTestId('my-course-course-2')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'On going' })).toBeOnTheScreen();
    expect(screen.getByText('Courses that boost your career!')).toBeOnTheScreen();
  });

  it('shows the stat chips: in progress, completed and the time learned', async () => {
    await render(<MyCoursesScreen />);

    expect(screen.getByTestId('stat-ongoing')).toHaveAccessibleName('In progress: 5');
    expect(screen.getByTestId('stat-completed')).toHaveAccessibleName('Completed: 3');
    expect(screen.getByTestId('stat-learning')).toHaveAccessibleName('Time learned: 6 h 20 min');
  });

  it('hides the stat chips when the stats could not be loaded', async () => {
    mockStatsResult = { data: undefined, isPending: false };
    await render(<MyCoursesScreen />);

    expect(screen.queryByTestId('my-courses-stats')).not.toBeOnTheScreen();
  });

  it('promotes the newest unfinished course to the Continue learning hero', async () => {
    await render(<MyCoursesScreen />);

    const hero = screen.getByTestId('my-courses-hero');
    expect(within(hero).getByText('Continue learning')).toBeOnTheScreen();
    expect(within(hero).getByText('UX Foundation')).toBeOnTheScreen();
    expect(within(hero).getByText('Lesson 4/10 · Wireframes')).toBeOnTheScreen();
    expect(within(hero).getByText('30%')).toBeOnTheScreen();
  });

  it('resumes the last lesson from the hero and opens the course page from Course details', async () => {
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-1', lessonId: 'lesson-7' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Course details' }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course/[id]',
      params: { id: 'course-1' },
    });
  });

  it('has no hero when every course is finished or on the Completed tab', async () => {
    setResult({ data: [ITEMS[1]] });
    const { unmount } = await render(<MyCoursesScreen />);
    expect(screen.queryByTestId('my-courses-hero')).not.toBeOnTheScreen();
    await unmount();

    setResult({});
    await render(<MyCoursesScreen />);
    expect(screen.getByTestId('my-courses-hero')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
    expect(screen.queryByTestId('my-courses-hero')).not.toBeOnTheScreen();
  });

  it('shows progress and lesson count on a card and resumes the last lesson when pressed', async () => {
    await render(<MyCoursesScreen />);

    const card = screen.getByTestId('my-course-course-1');
    expect(within(card).getByText('30% · 3/10 lessons')).toBeOnTheScreen();
    await fireEvent.press(card);
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-1', lessonId: 'lesson-7' },
    });
  });

  it('marks a finished course with a Completed badge and a Review action', async () => {
    await render(<MyCoursesScreen />);

    const card = screen.getByTestId('my-course-course-2');
    expect(within(card).getByText('Completed')).toBeOnTheScreen();
    expect(within(card).getByText('Review')).toBeOnTheScreen();
    expect(within(card).queryByText(/Lesson/)).not.toBeOnTheScreen();
    expect(screen.getByTestId('my-course-course-1')).not.toHaveTextContent('Review');
  });

  it('switches tab through the router params', async () => {
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
    expect(mockSetParams).toHaveBeenCalledWith({ tab: 'completed' });
  });

  it('shows skeleton cards while loading, an empty state and an error with Retry', async () => {
    setResult({ data: undefined, isPending: true });
    const { unmount } = await render(<MyCoursesScreen />);
    expect(screen.queryByTestId('my-courses-grid')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeOnTheScreen();
    await unmount();

    setResult({ data: [] });
    const empty = await render(<MyCoursesScreen />);
    expect(screen.getByText("You haven't started any course yet")).toBeOnTheScreen();
    await empty.unmount();

    setResult({
      data: undefined,
      isError: true,
      error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    });
    await render(<MyCoursesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('explains an empty tab and offers to explore courses', async () => {
    setResult({ data: [] });
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
    expect(screen.getByText('No completed course yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('keeps the phone list (Continue learning poster, no grid) below 768 wide', async () => {
    setWidth(390);
    await render(<MyCoursesScreen />);

    expect(screen.getByText('Continue learning')).toBeOnTheScreen();
    expect(screen.queryByTestId('my-courses-grid')).not.toBeOnTheScreen();
  });
});
