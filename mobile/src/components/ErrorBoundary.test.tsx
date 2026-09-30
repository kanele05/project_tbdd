import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <Text>Recovered</Text>;
}

describe('ErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = true;
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('shows the fallback when a child throws and recovers on Try again', async () => {
    const onReset = jest.fn();
    await render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();

    shouldThrow = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Recovered')).toBeOnTheScreen();
  });

  it('renders children when nothing throws', async () => {
    shouldThrow = false;
    await render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Recovered')).toBeOnTheScreen();
  });
});
