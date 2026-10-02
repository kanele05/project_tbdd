import { render, screen } from '@testing-library/react-native';

import type { ReviewDto } from '@/types/api';

import { ReviewCard } from './ReviewCard';
import { ReviewSummary } from './ReviewSummary';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeReview(overrides: Partial<ReviewDto> = {}): ReviewDto {
  return {
    id: 'review-1',
    rating: 4,
    content: 'Deserunt minim incididunt cillum nostrud do voluptate excepteur.',
    createdAt: new Date(Date.now() - DAY_MS).toISOString(),
    user: { id: 'user-1', fullName: 'Jane Barry', avatarUrl: null },
    ...overrides,
  };
}

describe('ReviewCard', () => {
  it('shows the author, how long ago, the stars and the text', async () => {
    await render(<ReviewCard review={makeReview()} />);

    expect(screen.getByText('Jane Barry')).toBeOnTheScreen();
    expect(screen.getByText('A day ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rated 4 out of 5 stars')).toBeOnTheScreen();
    expect(screen.getByText(/Deserunt minim incididunt/)).toBeOnTheScreen();
  });

  it('limits the text to three lines', async () => {
    await render(<ReviewCard review={makeReview()} />);

    expect(screen.getByText(/Deserunt minim incididunt/).props.numberOfLines).toBe(3);
  });

  it('shows the course title only when asked (Teacher profile)', async () => {
    const review = makeReview({ course: { id: 'course-1', title: 'UX Foundation' } });
    const { rerender } = await render(<ReviewCard review={review} />);
    expect(screen.queryByText('UX Foundation')).not.toBeOnTheScreen();

    await rerender(<ReviewCard review={review} showCourseTitle />);

    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
  });

  it('does not crash without a course when showCourseTitle is on', async () => {
    await render(<ReviewCard review={makeReview()} showCourseTitle />);

    expect(screen.getByText('Jane Barry')).toBeOnTheScreen();
  });
});

describe('ReviewSummary', () => {
  it('shows the average, the total and one bar per star', async () => {
    await render(
      <ReviewSummary
        summary={{ avg: 4.5, count: 10, distribution: { 5: 6, 4: 3, 3: 1, 2: 0, 1: 0 } }}
      />,
    );

    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('10 reviews')).toBeOnTheScreen();
    expect(screen.getAllByRole('progressbar')).toHaveLength(5);
    expect(screen.getByText('6')).toBeOnTheScreen();
  });

  it('handles a course without reviews', async () => {
    await render(
      <ReviewSummary
        summary={{ avg: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }}
      />,
    );

    expect(screen.getByText('0 reviews')).toBeOnTheScreen();
  });
});
