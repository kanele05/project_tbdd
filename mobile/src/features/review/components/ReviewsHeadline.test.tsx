import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';

import { ReviewsHeadline } from './ReviewsHeadline';
import { ReviewSummary } from './ReviewSummary';

const SUMMARY = { avg: 4.5, count: 1233, distribution: { 5: 800, 4: 300, 3: 100, 2: 20, 1: 13 } };

describe('ReviewsHeadline', () => {
  it('shows "4.5/5 (1233 reviews)" and opens View all', async () => {
    const onViewAll = jest.fn();
    await render(<ReviewsHeadline summary={SUMMARY} onViewAll={onViewAll} />);

    expect(screen.getByText('4.5/5')).toBeOnTheScreen();
    expect(screen.getByText('(1233 reviews)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rated 4.5 out of 5, 1233 reviews')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'View all reviews' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('says "1 review" for a single review', async () => {
    await render(<ReviewsHeadline summary={{ ...SUMMARY, count: 1 }} onViewAll={jest.fn()} />);

    expect(screen.getByText('(1 review)')).toBeOnTheScreen();
  });

  it('shows the exact total without a "+" (6 reviews, BUG-DISC-05)', async () => {
    await render(<ReviewsHeadline summary={{ ...SUMMARY, count: 6 }} onViewAll={jest.fn()} />);

    expect(screen.getByText('(6 reviews)')).toBeOnTheScreen();
    expect(screen.queryByText(/\+/)).not.toBeOnTheScreen();
  });

  it('shows the exact total in Vietnamese too', async () => {
    await i18n.changeLanguage('vi');
    await render(<ReviewsHeadline summary={{ ...SUMMARY, count: 6 }} onViewAll={jest.fn()} />);

    expect(screen.getByText('(6 đánh giá)')).toBeOnTheScreen();
  });

  it('is written in Vietnamese with a decimal comma', async () => {
    await i18n.changeLanguage('vi');
    await render(<ReviewsHeadline summary={SUMMARY} onViewAll={jest.fn()} />);

    expect(screen.getByText('4,5/5')).toBeOnTheScreen();
    expect(screen.getByText('(1233 đánh giá)')).toBeOnTheScreen();
    expect(screen.getByText('Xem tất cả')).toBeOnTheScreen();
  });
});

describe('ReviewSummary', () => {
  it('shows the average, the total and one row per star', async () => {
    await render(<ReviewSummary summary={SUMMARY} />);

    expect(screen.getByLabelText('Average rating 4.5 out of 5, 1233 reviews')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 stars: 800')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 stars: 13')).toBeOnTheScreen();
  });

  it('handles a course without reviews', async () => {
    await render(
      <ReviewSummary
        summary={{ avg: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }}
      />,
    );

    expect(screen.getByLabelText('Average rating 0.0 out of 5, 0 reviews')).toBeOnTheScreen();
  });
});
