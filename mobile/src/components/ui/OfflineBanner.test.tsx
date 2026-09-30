import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('is hidden while online', async () => {
    onlineManager.setOnline(true);
    await render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeOnTheScreen();
  });

  it('appears when the app goes offline and disappears when it is back', async () => {
    onlineManager.setOnline(true);
    await render(<OfflineBanner />);

    await act(async () => {
      onlineManager.setOnline(false);
    });
    expect(screen.getByText("You're offline - showing saved data")).toBeOnTheScreen();

    await act(async () => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByText(/offline/i)).not.toBeOnTheScreen();
  });

  it('can be forced visible', async () => {
    await render(<OfflineBanner visible />);
    expect(screen.getByText(/offline/i)).toBeOnTheScreen();
  });
});
