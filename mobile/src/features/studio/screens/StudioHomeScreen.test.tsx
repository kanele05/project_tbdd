import { fireEvent, screen } from '@testing-library/react-native';

import { resources } from '@/i18n';
import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { CourseStatus, StudioListSummaryDto } from '@/types/api';

import { makeSummary } from '../studioFixtures';
import { StudioHomeScreen } from './StudioHomeScreen';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockUseStudioCourses = jest.fn();
let mockResult: Record<string, unknown> = {};

jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (callback: () => void) => {
      useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../hooks', () => ({
  useStudioCourses: (status: string) => {
    mockUseStudioCourses(status);
    return mockResult;
  },
}));

const SUMMARY: StudioListSummaryDto = {
  courseCount: 3,
  totalEnrollments: 1234,
  totalRevenueCents: 550000,
  byStatus: {
    DRAFT: 1,
    PENDING_REVIEW: 0,
    PUBLISHED: 2,
    REJECTED: 0,
    ARCHIVED: 0,
  } satisfies Record<CourseStatus, number>,
};

function setResult(overrides: Record<string, unknown>) {
  mockResult = {
    courses: [],
    summary: SUMMARY,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: mockRefetch,
    ...overrides,
  };
}

describe('StudioHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setResult({});
  });

  it('shows skeleton cards while loading', async () => {
    setResult({ isPending: true, summary: undefined });
    await renderWithProviders(<StudioHomeScreen />);
    expect(screen.getAllByTestId('studio-card-skeleton')).toHaveLength(3);
  });

  it('shows the error with a Retry that refetches', async () => {
    setResult({ isError: true, error: new AppError({ status: 500, code: 'X', message: 'boom' }) });
    await renderWithProviders(<StudioHomeScreen />);
    await fireEvent.press(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows the empty state with a button that starts a new course', async () => {
    await renderWithProviders(<StudioHomeScreen />);
    expect(screen.getByText('No courses yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByText('New course')[1] as never);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/studio/[id]/edit',
      params: { id: 'new' },
    });
  });

  it('lists the courses with status chip, price and students, and opens one', async () => {
    const draft = makeSummary({ id: 'c1', title: 'Draft course', status: 'DRAFT' });
    const rejected = makeSummary({
      id: 'c2',
      title: 'Rejected course',
      status: 'REJECTED',
      rejectionReason: 'Add more lessons',
      priceCents: 0,
    });
    const published = makeSummary({
      id: 'c3',
      title: 'Live course',
      status: 'PUBLISHED',
      enrollmentCount: 12,
      revisionStatus: 'PENDING_REVIEW',
      thumbnailUrl: '',
    });
    setResult({ courses: [draft, rejected, published] });
    await renderWithProviders(<StudioHomeScreen />);

    expect(screen.getByTestId('status-chip-DRAFT')).toBeOnTheScreen();
    expect(screen.getByTestId('status-chip-REJECTED')).toBeOnTheScreen();
    expect(screen.getByTestId('status-chip-PUBLISHED')).toBeOnTheScreen();
    expect(screen.getByTestId('revision-chip-PENDING_REVIEW')).toBeOnTheScreen();
    expect(screen.getByText('Rejected: Add more lessons')).toBeOnTheScreen();
    expect(screen.getByTestId('studio-card-no-cover')).toBeOnTheScreen();
    expect(screen.getByText('Free · 0 students')).toBeOnTheScreen();
    expect(screen.getByText('$29.99 · 12 students')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('studio-course-c3'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/studio/[id]', params: { id: 'c3' } });
  });

  it('shows the totals of the whole account', async () => {
    setResult({ courses: [makeSummary()] });
    await renderWithProviders(<StudioHomeScreen />);
    const summary = screen.getByTestId('studio-summary');
    expect(summary).toHaveTextContent(/1,234/);
    expect(summary).toHaveTextContent(/\$5,500/);
    expect(summary).toHaveTextContent(/^3/);
  });

  it('filters by status and explains an empty filter', async () => {
    await renderWithProviders(<StudioHomeScreen />);
    await fireEvent.press(screen.getByTestId('studio-filter-ARCHIVED'));
    expect(mockUseStudioCourses).toHaveBeenLastCalledWith('ARCHIVED');
    expect(screen.getByText('Nothing here')).toBeOnTheScreen();
    expect(screen.getByText('You have no courses with the status "Hidden".')).toBeOnTheScreen();
  });

  it('renders in Vietnamese', async () => {
    setResult({ courses: [makeSummary({ status: 'PENDING_REVIEW' })] });
    await renderWithProviders(<StudioHomeScreen />, { language: 'vi', theme: 'dark' });
    expect(screen.getByText('Giảng dạy')).toBeOnTheScreen();
    expect(screen.getByText('Khóa học mới')).toBeOnTheScreen();
    expect(screen.getByTestId('status-chip-PENDING_REVIEW')).toHaveTextContent(
      new RegExp(resources.vi.studio.status.PENDING_REVIEW),
    );
  });
});
