import { render, screen } from '@testing-library/react-native';

import { RatingInline } from './RatingInline';

describe('RatingInline', () => {
  it('renders rating, count and lessons like the design', async () => {
    await render(<RatingInline rating={4.5} count={1233} lessonCount={12} />);

    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(1233)')).toBeOnTheScreen();
    expect(screen.getByText('12 lessons')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rated 4.5 out of 5, 1233 ratings, 12 lessons')).toBeOnTheScreen();
  });

  it('formats the rating with one decimal and singular lesson', async () => {
    await render(<RatingInline rating={4} lessonCount={1} />);
    expect(screen.getByText('4.0')).toBeOnTheScreen();
    expect(screen.getByText('1 lesson')).toBeOnTheScreen();
  });
});
