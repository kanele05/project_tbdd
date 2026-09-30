import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScreenHeader } from './ScreenHeader';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (href: string) => mockReplace(href),
    canGoBack: () => mockCanGoBack,
  },
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it('renders the title and right actions', async () => {
    await render(<ScreenHeader title="Course details" right={<Text>action</Text>} />);
    expect(screen.getByText('Course details')).toBeOnTheScreen();
    expect(screen.getByText('action')).toBeOnTheScreen();
  });

  it('goes back through the router by default', async () => {
    await render(<ScreenHeader title="Cart" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to home when there is no history', async () => {
    mockCanGoBack = false;
    await render(<ScreenHeader title="Cart" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('supports a custom back handler and hides the back button', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<ScreenHeader title="Cart" onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<ScreenHeader title="Cart" showBack={false} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
