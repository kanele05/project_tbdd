import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { HoverRail } from './HoverRail';

const ITEMS = ['One', 'Two', 'Three'];

function renderRail(onViewMore?: () => void) {
  return renderWithProviders(
    <HoverRail
      testID="rail"
      title="Popular"
      onViewMore={onViewMore}
      data={ITEMS}
      keyExtractor={(item) => item}
      renderItem={(item, _index, width) => (
        <Text testID={`card-${item}`}>{`${item}:${width}`}</Text>
      )}
    />,
  );
}

/** Pretend the row is 1000 dp wide and its cards 2400 dp long, so it can scroll. */
async function measureRail() {
  const root = screen.getByTestId('rail');
  await fireEvent(root, 'layout', { nativeEvent: { layout: { width: 1000, height: 300 } } });
  await fireEvent(screen.getByTestId('rail-scroll'), 'contentSizeChange', 2400, 300);
  return root;
}

describe('HoverRail', () => {
  it('renders the title, a link and every card with the width of the row', async () => {
    const onViewMore = jest.fn();
    await renderRail(onViewMore);

    expect(screen.getByRole('header', { name: 'Popular' })).toBeOnTheScreen();
    expect(screen.getByTestId('card-One')).toBeOnTheScreen();
    expect(screen.getByTestId('card-Three')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'View more, Popular' }));
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });

  it('has no arrows while everything fits', async () => {
    await renderRail();
    expect(screen.queryByRole('button', { name: 'Scroll right' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeOnTheScreen();
  });

  it('shows the right arrow only while the pointer is over the row, then the left one after scrolling', async () => {
    await renderRail();
    const root = await measureRail();

    const right = screen.getByRole('button', { name: 'Scroll right' });
    expect(right).toHaveStyle({ opacity: 0 });
    expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeOnTheScreen();

    await fireEvent(root, 'pointerEnter');
    expect(screen.getByRole('button', { name: 'Scroll right' })).not.toHaveStyle({ opacity: 0 });

    await fireEvent.scroll(screen.getByTestId('rail-scroll'), {
      nativeEvent: { contentOffset: { x: 600, y: 0 } },
    });
    expect(screen.getByRole('button', { name: 'Scroll left' })).toBeOnTheScreen();

    await fireEvent(root, 'pointerLeave');
    expect(screen.getByRole('button', { name: 'Scroll left' })).toHaveStyle({ opacity: 0 });
  });
});
