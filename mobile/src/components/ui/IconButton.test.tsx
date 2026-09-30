import { fireEvent, render, screen } from '@testing-library/react-native';

import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('exposes the accessibility label and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="bell" accessibilityLabel="Notifications" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Notifications' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a count badge only when the count is positive', async () => {
    const { rerender } = await render(
      <IconButton icon="shopping-cart" accessibilityLabel="Cart" badgeCount={3} />,
    );
    expect(screen.getByText('3')).toBeOnTheScreen();

    await rerender(<IconButton icon="shopping-cart" accessibilityLabel="Cart" badgeCount={0} />);
    expect(screen.queryByText('0')).not.toBeOnTheScreen();
  });
});
