import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ToastProvider, showToast, useToast } from './Toast';

function Trigger() {
  const toast = useToast();
  return (
    <Text onPress={() => toast.success('Saved!')} testID="trigger">
      go
    </Text>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a message from useToast and hides it after the duration', async () => {
    await render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Saved!')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(3500);
    });
    expect(screen.queryByText('Saved!')).not.toBeOnTheScreen();
  });

  it('can be triggered from outside React via showToast and runs the action', async () => {
    const onAction = jest.fn();
    await render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await act(async () => {
      showToast('Removed', { actionLabel: 'Undo', onAction });
    });
    expect(screen.getByText('Removed')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('throws a helpful error when used outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Trigger />)).rejects.toThrow(
      'useToast must be used within a ToastProvider',
    );
    spy.mockRestore();
  });
});
