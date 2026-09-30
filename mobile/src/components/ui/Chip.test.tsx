import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';

describe('Chip', () => {
  it('renders the label and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Javascript" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Javascript' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks a selected chip as selected for screen readers', async () => {
    await render(<Chip label="All" selected leftIcon="star" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
  });

  it('is a static label without onPress', async () => {
    await render(<Chip label="Top-rated" />);
    expect(screen.getByText('Top-rated')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Top-rated' })).not.toBeOnTheScreen();
  });
});
