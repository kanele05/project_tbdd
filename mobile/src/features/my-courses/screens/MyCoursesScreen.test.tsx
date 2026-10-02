import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import type { MyCourseItem } from '@/types/api';

import { MyCoursesScreen } from './MyCoursesScreen';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockRefetch = jest.fn();
const mockUseMyCourses = jest.fn();
const mockStartSync = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockResult: Record<string, unknown> = {};
let mockFocusCallback: (() => void) | null = null;

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
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void) => {
      mockFocusCallback = callback;
      useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../hooks', () => ({
  useMyCourses: (status: string) => {
    mockUseMyCourses(status);
    return mockResult;
  },
}));

jest.mock('@/features/learning/progressSync', () => ({
  startPendingProgressSync: () => mockStartSync(),
}));

const ITEMS: MyCourseItem[] = [
  {
    course: { id: 'course-1', title: 'UX Foundation', thumbnailUrl: 'https://example.com/1.png' },
    totalDurationSec: 8700,
    progressPercent: 30,
    lastLessonId: 'lesson-7',
    lastAccessedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    course: {
      id: 'course-2',
      title: 'Creative Art Design',
      thumbnailUrl: 'https://example.com/2.png',
    },
    totalDurationSec: 12300,
    progressPercent: 100,
    lastLessonId: null,
    lastAccessedAt: '2026-09-30T10:00:00.000Z',
  },
];

function setResult(overrides: Record<string, unknown>) {
  mockResult = {
    data: ITEMS,
    isPending: false,
    isError: false,
    isRefetching: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
    ...overrides,
  };
}

describe('MyCoursesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockFocusCallback = null;
    mockRefetch.mockResolvedValue(undefined);
    setResult({});
  });

  it('shows a progress card per course with duration, percentage and progress bar', async () => {
    await render(<MyCoursesScreen />);

    expect(screen.getByText('My Courses')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByText('2 hrs 25 mins')).toBeOnTheScreen();
    expect(screen.getByText('30% Complete')).toBeOnTheScreen();
    expect(screen.getByText('100% Complete')).toBeOnTheScreen();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('shows the promo banner and sends "Check Now" to the Search tab', async () => {
    await render(<MyCoursesScreen />);
    expect(screen.getByText('Courses that boost your career!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Check Now' }));

    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('starts on ALL and queries each tab with its status', async () => {
    await render(<MyCoursesScreen />);
    expect(mockUseMyCourses).toHaveBeenLastCalledWith('all');

    await fireEvent.press(screen.getByRole('tab', { name: 'On going' }));
    expect(mockUseMyCourses).toHaveBeenLastCalledWith('ongoing');
    expect(mockSetParams).toHaveBeenLastCalledWith({ tab: 'ongoing' });

    await fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
    expect(mockUseMyCourses).toHaveBeenLastCalledWith('completed');
  });

  it('opens on the tab given by ?tab= (Profile stats link)', async () => {
    mockParams = { tab: 'completed' };

    await render(<MyCoursesScreen />);

    expect(mockUseMyCourses).toHaveBeenLastCalledWith('completed');
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeSelected();
  });

  it('follows a new ?tab= while the tab is already mounted', async () => {
    const { rerender } = await render(<MyCoursesScreen />);
    expect(screen.getByRole('tab', { name: 'All' })).toBeSelected();

    mockParams = { tab: 'ongoing' };
    await rerender(<MyCoursesScreen />);

    expect(screen.getByRole('tab', { name: 'On going' })).toBeSelected();
    expect(mockUseMyCourses).toHaveBeenLastCalledWith('ongoing');
  });

  it('ignores an unknown ?tab= value', async () => {
    mockParams = { tab: 'archived' };

    await render(<MyCoursesScreen />);

    expect(mockUseMyCourses).toHaveBeenLastCalledWith('all');
  });

  it('opens the Learning screen at the last lesson of the course', async () => {
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByTestId('my-course-course-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-1', lessonId: 'lesson-7' },
    });
  });

  it('opens the Learning screen without a lesson when none was started', async () => {
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByTestId('my-course-course-2'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-2' },
    });
  });

  it('refetches when the screen regains focus, but not on the first focus', async () => {
    await render(<MyCoursesScreen />);
    expect(mockRefetch).not.toHaveBeenCalled();

    mockFocusCallback?.();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('syncs the progress queued while offline when opened', async () => {
    await render(<MyCoursesScreen />);

    expect(mockStartSync).toHaveBeenCalledTimes(1);
  });

  describe('empty states', () => {
    beforeEach(() => {
      setResult({ data: [] });
    });

    it('invites to explore courses on ALL', async () => {
      await render(<MyCoursesScreen />);

      expect(screen.getByText("You haven't started any course yet")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
      expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    it('has its own message on ON GOING and COMPLETED', async () => {
      await render(<MyCoursesScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'On going' }));
      expect(screen.getByText('No course in progress')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
      expect(screen.getByText('No completed course yet')).toBeOnTheScreen();
    });
  });

  it('shows skeletons while loading', async () => {
    setResult({ data: undefined, isPending: true, fetchStatus: 'fetching' });

    await render(<MyCoursesScreen />);

    expect(screen.queryByText("You haven't started any course yet")).not.toBeOnTheScreen();
    expect(screen.queryByTestId('my-course-course-1')).not.toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    setResult({
      data: undefined,
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows the offline state when there is nothing cached', async () => {
    setResult({ data: undefined, isPending: true, fetchStatus: 'paused' });

    await render(<MyCoursesScreen />);

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
  });
});
