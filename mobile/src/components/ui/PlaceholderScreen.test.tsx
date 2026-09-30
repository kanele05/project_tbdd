import { render, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from './PlaceholderScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

describe('PlaceholderScreen', () => {
  it('shows the SC code and title', async () => {
    await render(<PlaceholderScreen code="SC-12" title="My cart" />);
    expect(screen.getByText('SC-12')).toBeOnTheScreen();
    expect(screen.getAllByText('My cart').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });

  it('can hide the header (tab screens)', async () => {
    await render(<PlaceholderScreen code="SC-04" title="Home" showHeader={false} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
    expect(screen.getByText('Home')).toBeOnTheScreen();
  });
});
