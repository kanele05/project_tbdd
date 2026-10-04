import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CinematicHeader } from './CinematicHeader';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: jest.fn(), canGoBack: () => true },
}));

describe('CinematicHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the title as a header and the optional subtitle', async () => {
    await renderWithProviders(<CinematicHeader title="Checkout" subtitle="2 courses" />);
    expect(screen.getByRole('header', { name: 'Checkout' })).toBeOnTheScreen();
    expect(screen.getByText('2 courses')).toBeOnTheScreen();
  });

  it('goes back from the glass button', async () => {
    await renderWithProviders(<CinematicHeader title="Settings" />);
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('uses a custom back handler and hides the button when showBack is false', async () => {
    const onBack = jest.fn();
    const { unmount } = await renderWithProviders(<CinematicHeader title="A" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
    unmount();

    await renderWithProviders(<CinematicHeader title="B" showBack={false} />);
    expect(screen.queryByLabelText('Back')).toBeNull();
  });

  it('renders the right slot', async () => {
    await renderWithProviders(
      <CinematicHeader title="Review" showBack={false} right={<Text>Close</Text>} />,
    );
    expect(screen.getByText('Close')).toBeOnTheScreen();
  });

  it('works in dark mode with a remote photo', async () => {
    await renderWithProviders(<CinematicHeader title="Edit" uri="https://example.com/a.jpg" />, {
      theme: 'dark',
    });
    expect(screen.getByRole('header', { name: 'Edit' })).toBeOnTheScreen();
  });
});
