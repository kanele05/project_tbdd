import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import type { ReviewDto, ReviewSummaryDto } from '@/types/api';

import { CourseReviewsTab } from './CourseReviewsTab';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockUseCourseReviews = jest.fn();
let mockSummary: Record<string, unknown> = {};
let mockReviews: Record<string, unknown> = {};
let mockMine: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../hooks', () => ({
  REVIEW_FILTERS: ['all', 5, 4, 3, 2, 1],
  useReviewSummary: () => mockSummary,
  useCourseReviews: (courseId: string, filter: unknown) => {
    mockUseCourseReviews(courseId, filter);
    return mockReviews;
  },
  useMyReview: () => mockMine,
}));

let mockIsOwner = false;
const mockDeleteReply = jest.fn();
jest.mock('@/features/teaching/hooks', () => ({
  useCourseTeacherInfo: () => ({ teacherName: 'Dr. Teach', isOwner: mockIsOwner }),
  useDeleteReviewReply: () => ({ mutate: mockDeleteReply }),
  useReplyToReview: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: () => Promise.resolve(true) }));

const SUMMARY: ReviewSummaryDto = {
  avg: 4.5,
  count: 1233,
  distribution: { 5: 800, 4: 300, 3: 100, 2: 20, 1: 13 },
};

function makeReviews(count: number): ReviewDto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `review-${index + 1}`,
    rating: 5,
    content: `Review text ${index + 1}`,
    createdAt: new Date().toISOString(),
    user: { id: `user-${index + 1}`, fullName: `Reviewer ${index + 1}`, avatarUrl: null },
    teacherReply: null,
    teacherRepliedAt: null,
  }));
}

function setReviews(reviews: ReviewDto[], overrides: Record<string, unknown> = {}) {
  mockReviews = {
    data: { pages: [{ data: reviews, meta: { page: 1, limit: 20, total: reviews.length } }] },
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
    ...overrides,
  };
}

describe('CourseReviewsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOwner = false;
    mockSummary = { data: SUMMARY, refetch: mockRefetch };
    mockMine = { data: null };
    setReviews(makeReviews(8));
  });

  it('shows the headline "4.5/5 (1233+ reviews)"', async () => {
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    expect(screen.getByText('4.5/5')).toBeOnTheScreen();
    expect(screen.getByText('(1233+ reviews)')).toBeOnTheScreen();
  });

  it('shows at most five reviews', async () => {
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    expect(screen.getAllByTestId(/^review-review-/)).toHaveLength(5);
    expect(screen.getByText('Review text 5')).toBeOnTheScreen();
    expect(screen.queryByText('Review text 6')).not.toBeOnTheScreen();
  });

  it('opens SC-10 from "View all"', async () => {
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    await fireEvent.press(screen.getByRole('link', { name: 'View all reviews' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/course/[id]/reviews',
      params: { id: 'course-1' },
    });
  });

  it('filters by stars with the chips All / 5 / 4 / 3 / 2 / 1', async () => {
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);
    expect(mockUseCourseReviews).toHaveBeenLastCalledWith('course-1', 'all');
    expect(screen.getByTestId('review-filter-all')).toBeSelected();

    await fireEvent.press(screen.getByTestId('review-filter-4'));

    expect(mockUseCourseReviews).toHaveBeenLastCalledWith('course-1', 4);
    expect(screen.getByTestId('review-filter-4')).toBeSelected();
    expect(screen.getByTestId('review-filter-all')).not.toBeSelected();
    for (const stars of [5, 3, 2, 1]) {
      expect(screen.getByTestId(`review-filter-${stars}`)).toBeOnTheScreen();
    }
  });

  it('shows "Write a review" only for enrolled users and opens SC-11', async () => {
    const { rerender } = await render(
      <CourseReviewsTab courseId="course-1" canWriteReview={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeOnTheScreen();

    await rerender(<CourseReviewsTab courseId="course-1" canWriteReview />);
    await fireEvent.press(screen.getByRole('button', { name: 'Write a review' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/course/[id]/write-review',
      params: { id: 'course-1' },
    });
  });

  it('offers to edit when the user already reviewed the course', async () => {
    mockMine = { data: makeReviews(1)[0] };

    await render(<CourseReviewsTab courseId="course-1" canWriteReview />);

    expect(screen.getByRole('button', { name: 'Edit your review' })).toBeOnTheScreen();
  });

  it('shows an empty state when the course has no review', async () => {
    mockSummary = { data: { ...SUMMARY, count: 0, avg: 0 }, refetch: mockRefetch };
    setReviews([]);

    await render(<CourseReviewsTab courseId="course-1" canWriteReview />);

    expect(screen.getByText('No reviews yet')).toBeOnTheScreen();
  });

  it('explains when a star filter has no review', async () => {
    setReviews([]);
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    await fireEvent.press(screen.getByTestId('review-filter-2'));

    expect(screen.getByText('No 2-star reviews yet')).toBeOnTheScreen();
  });

  it('shows skeletons while loading', async () => {
    mockSummary = { data: undefined, refetch: mockRefetch };
    setReviews([], { data: undefined, isPending: true, fetchStatus: 'fetching' });

    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    expect(screen.queryByText('No reviews yet')).not.toBeOnTheScreen();
    expect(screen.queryByTestId(/^review-review-/)).not.toBeOnTheScreen();
  });

  it('shows an error with Retry when loading fails', async () => {
    setReviews([], {
      data: undefined,
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

    expect(screen.getByText("Couldn't load the reviews")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  describe('instructor replies (BR-25)', () => {
    it('shows the teacher reply under the review with the Instructor badge', async () => {
      setReviews([
        {
          ...makeReviews(1)[0]!,
          teacherReply: 'Thanks for the kind words!',
          teacherRepliedAt: new Date().toISOString(),
        },
      ]);

      await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

      expect(screen.getByTestId('review-reply-review-1')).toBeOnTheScreen();
      expect(screen.getByText('Thanks for the kind words!')).toBeOnTheScreen();
      expect(screen.getByText('Dr. Teach')).toBeOnTheScreen();
      expect(screen.getByText('Instructor')).toBeOnTheScreen();
    });

    it('offers no reply actions to students', async () => {
      await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);

      expect(screen.queryByTestId('reply-review-1')).not.toBeOnTheScreen();
    });

    it('lets the course teacher open the reply sheet and delete an existing reply', async () => {
      mockIsOwner = true;
      setReviews([
        makeReviews(2)[0]!,
        { ...makeReviews(2)[1]!, teacherReply: 'Thank you', teacherRepliedAt: null },
      ]);

      await render(<CourseReviewsTab courseId="course-1" canWriteReview={false} />);
      expect(screen.queryByTestId('review-reply-sheet')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('reply-review-1'));
      expect(screen.getByTestId('review-reply-sheet')).toBeOnTheScreen();
      expect(screen.getByText('Reply to review')).toBeOnTheScreen();

      expect(
        screen.getByRole('button', { name: 'Edit your reply to the review by Reviewer 2' }),
      ).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('delete-reply-review-2'));
      await waitFor(() =>
        expect(mockDeleteReply).toHaveBeenCalledWith('review-2', expect.anything()),
      );
    });
  });
});
