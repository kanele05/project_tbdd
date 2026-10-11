import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { AppError } from '@/lib/appError';
import type { MyCourseItem } from '@/types/api';

import { MyCoursesScreen } from './MyCoursesScreen';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockRefetch = jest.fn();
let mockResult: Record<string, unknown> = {};

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
jest.mock('@/features/learning/progressSync', () => ({ startPendingProgressSync: jest.fn() }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const ITEMS: MyCourseItem[] = [
  {
    course: { id: 'course-1', title: 'UX Foundation', thumbnailUrl: 'https://example.com/1.png' },
    totalDurationSec: 8700,
    progressPercent: 30,
    lastLessonId: 'lesson-7',
    lastAccessedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    course: { id: 'course-2', title: 'Creative Art', thumbnailUrl: 'https://example.com/2.png' },
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
  });

  it('lists every course as a poster card in a grid, with the tabs and the career banner', async () => {
    await render(<MyCoursesScreen />);

    expect(screen.getByRole('header', { name: 'My Courses' })).toBeOnTheScreen();
    expect(screen.getByTestId('my-courses-grid')).toBeOnTheScreen();
    expect(screen.getByTestId('my-course-course-1')).toBeOnTheScreen();
    expect(screen.getByTestId('my-course-course-2')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'On going' })).toBeOnTheScreen();
    expect(screen.getByText('Courses that boost your career!')).toBeOnTheScreen();
  });

  it('resumes the last lesson when a card is pressed', async () => {
    await render(<MyCoursesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^UX Foundation, 30%/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'course-1', lessonId: 'lesson-7' },
    });
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

  it('keeps the phone list (Continue learning poster, no grid) below 768 wide', async () => {
    setWidth(390);
    await render(<MyCoursesScreen />);

    expect(screen.getByText('Continue learning')).toBeOnTheScreen();
    expect(screen.queryByTestId('my-courses-grid')).not.toBeOnTheScreen();
  });
});
