import { fireEvent, render, screen } from '@testing-library/react-native';

import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('describes the rating when display-only', async () => {
    await render(<StarRating value={4} />);
    expect(screen.getByLabelText('Rated 4 out of 5 stars')).toBeOnTheScreen();
  });

  it('lets the user pick a rating when onChange is provided', async () => {
    const onChange = jest.fn();
    await render(<StarRating value={2} onChange={onChange} size={32} />);

    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    expect(onChange).toHaveBeenCalledWith(5);
    expect(screen.getByRole('radio', { name: '2 stars' })).toBeSelected();
  });
});
