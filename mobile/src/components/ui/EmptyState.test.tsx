import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, message and the call to action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="Your cart is empty"
        message="Add a course to get started."
        actionLabel="Explore courses"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
    expect(screen.getByText('Add a course to get started.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('has no button without an action', async () => {
    await render(<EmptyState />);
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
