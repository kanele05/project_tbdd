import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlayerStage } from './PlayerStage';
import { PlayerStatus } from './PlayerStatus';

describe('PlayerStatus', () => {
  it('shows the loading label without a retry button', async () => {
    await render(
      <PlayerStage>
        <PlayerStatus kind="loading" label="Loading video" retryLabel="Retry" onRetry={jest.fn()} />
      </PlayerStage>,
    );

    expect(screen.getByText('Loading video')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeOnTheScreen();
  });

  it('shows a short error message with a Retry button that calls onRetry', async () => {
    const onRetry = jest.fn();
    await render(
      <PlayerStage>
        <PlayerStatus kind="error" label="Video unavailable" retryLabel="Retry" onRetry={onRetry} />
      </PlayerStage>,
    );

    expect(screen.getByText('Video unavailable')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits Retry when there is no handler', async () => {
    await render(
      <PlayerStage>
        <PlayerStatus kind="error" label="Offline" retryLabel="Retry" />
      </PlayerStage>,
    );

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeOnTheScreen();
  });
});

describe('PlayerStage', () => {
  it('is a 16:9 box with an optional height cap', async () => {
    await render(
      <PlayerStage maxHeight={273} minHeight={200} testID="stage">
        <PlayerStatus kind="loading" label="Loading" />
      </PlayerStage>,
    );

    expect(screen.getByTestId('stage')).toHaveStyle({
      aspectRatio: 16 / 9,
      maxHeight: 273,
      minHeight: 200,
    });
  });
});
