import { fireEvent, render, screen } from '@testing-library/react-native';

import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('renders the title and a View more link that fires onViewMore', async () => {
    const onViewMore = jest.fn();
    await render(<SectionHeader title="Popular courses" onViewMore={onViewMore} />);

    expect(screen.getByText('Popular courses')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('View more'));
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });

  it('hides the link without onViewMore', async () => {
    await render(<SectionHeader title="Categories" />);
    expect(screen.queryByText('View more')).not.toBeOnTheScreen();
  });
});
