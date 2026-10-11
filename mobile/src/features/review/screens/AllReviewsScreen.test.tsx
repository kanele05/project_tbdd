import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { AppError } from '@/lib/appError';
import type { ReviewDto, ReviewSummaryDto } from '@/types/api';

import { AllReviewsScreen } from './AllReviewsScreen';

const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockUseCourseReviews = jest.fn();
let mockReviews: Record<string, unknown> = {};
let mockSummary: Record<string, unknown> = {};
let mockNumColumns: number | undefined;

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: (props: { numColumns?: number }) => {
      mockNumColumns = props.numColumns;
      return <FlatList {...props} />;
    },
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

jest.mock('../hooks', () => ({
  REVIEW_FILTERS: ['all', 5, 4, 3, 2, 1],
  useReviewSummary: () => mockSummary,
  useCourseReviews: (courseId: string, filter: unknown) => {
    mockUseCourseReviews(courseId, filter);
    return mockReviews;
  },
}));

let mockIsOwner = false;
const mockDeleteReply = jest.fn();
jest.mock('@/features/teaching/hooks', () => ({
  useCourseTeacherInfo: () => ({ teacherName: 'Dr. Teach', isOwner: mockIsOwner }),
  useDeleteReviewReply: () => ({ mutate: mockDeleteReply }),
  useReplyToReview: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: () => Promise.resolve(true) }));

const mockWindow = useWindowDimensions as jest.Mock;

const SUMMARY: ReviewSummaryDto = {
  avg: 4.5,
  count: 3,
  distribution: { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 },
};

function makeReviews(count: number, offset = 0): ReviewDto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `review-${offset + index + 1}`,
    rating: 5,
    content: `Review text ${offset + index + 1}`,
    createdAt: new Date().toISOString(),
    user: { id: `user-${index}`, fullName: `Reviewer ${offset + index + 1}`, avatarUrl: null },
    teacherReply: null,
    teacherRepliedAt: null,
  }));
}

function setReviews(pages: ReviewDto[][], overrides: Record<string, unknown> = {}) {
  mockReviews = {
    data: { pages: pages.map((data) => ({ data, meta: { page: 1, totalPages: 1 } })) },
    isPending: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchStatus: 'idle',
    error: null,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    ...overrides,
  };
}

describe('AllReviewsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    mockIsOwner = false;
    mockSummary = { data: SUMMARY, refetch: mockRefetch };
    setReviews([makeReviews(3)]);
  });

  it('shows the summary, the filter chips and the reviews', async () => {
    await render(<AllReviewsScreen courseId="course-1" />);

    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('3 reviews')).toBeOnTheScreen();
    expect(screen.getByTestId('review-filter-all')).toBeSelected();
    expect(screen.getByText('Review text 1')).toBeOnTheScreen();
    expect(screen.getByText('Review text 3')).toBeOnTheScreen();
  });

  it('lists the reviews of every loaded page without duplicates', async () => {
    setReviews([makeReviews(2), makeReviews(2, 1)]);

    await render(<AllReviewsScreen courseId="course-1" />);

    expect(screen.getAllByText(/^Review text/)).toHaveLength(3);
  });

  it('filters by stars', async () => {
    await render(<AllReviewsScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('review-filter-5'));

    expect(mockUseCourseReviews).toHaveBeenLastCalledWith('course-1', 5);
    expect(screen.getByTestId('review-filter-5')).toBeSelected();
  });

  it('loads the next page at the end of the list', async () => {
    setReviews([makeReviews(3)], { hasNextPage: true });
    await render(<AllReviewsScreen courseId="course-1" />);

    await fireEvent(screen.getByTestId('all-reviews-list'), 'endReached');

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not request another page while one is loading or when there is none', async () => {
    setReviews([makeReviews(3)], { hasNextPage: true, isFetchingNextPage: true });
    const { unmount } = await render(<AllReviewsScreen courseId="course-1" />);
    await fireEvent(screen.getByTestId('all-reviews-list'), 'endReached');
    expect(mockFetchNextPage).not.toHaveBeenCalled();
    await unmount();

    setReviews([makeReviews(3)], { hasNextPage: false });
    await render(<AllReviewsScreen courseId="course-1" />);
    await fireEvent(screen.getByTestId('all-reviews-list'), 'endReached');
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('shows an empty state for a star filter without reviews', async () => {
    await render(<AllReviewsScreen courseId="course-1" />);
    setReviews([[]]);

    await fireEvent.press(screen.getByTestId('review-filter-1'));

    expect(screen.getByText('No 1-star reviews yet')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    setReviews([], {
      data: undefined,
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await render(<AllReviewsScreen courseId="course-1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows the offline state instead of an endless skeleton', async () => {
    setReviews([], { data: undefined, isPending: true, fetchStatus: 'paused' });

    await render(<AllReviewsScreen courseId="course-1" />);

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
  });

  it('shows the instructor reply and, for the course teacher, the Reply action', async () => {
    mockIsOwner = true;
    setReviews([
      [
        {
          ...makeReviews(1)[0]!,
          teacherReply: 'Glad you liked it',
          teacherRepliedAt: new Date().toISOString(),
        },
      ],
    ]);

    await render(<AllReviewsScreen courseId="course-1" />);

    expect(screen.getByText('Glad you liked it')).toBeOnTheScreen();
    expect(screen.getByText('Instructor')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reply-review-1'));
    expect(screen.getByTestId('review-reply-sheet')).toBeOnTheScreen();
  });

  describe('layout by window width', () => {
    it('lists the reviews in one column on a phone', async () => {
      await render(<AllReviewsScreen courseId="course-1" />);

      expect(mockNumColumns).toBe(1);
    });

    it('lists the reviews as a two-column grid on a PC window', async () => {
      mockWindow.mockReturnValue({ width: 1280, height: 800, scale: 1, fontScale: 1 });

      await render(<AllReviewsScreen courseId="course-1" />);

      expect(mockNumColumns).toBe(2);
      expect(screen.getByText('Review text 1')).toBeOnTheScreen();
      expect(screen.getByText('Review text 3')).toBeOnTheScreen();
    });
  });
});
