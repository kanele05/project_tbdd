import { render, screen } from '@testing-library/react-native';

import { Badge } from './Badge';

describe('Badge', () => {
  it('renders a text badge', async () => {
    await render(<Badge label="Best-seller" />);
    expect(screen.getByText('Best-seller')).toBeOnTheScreen();
  });

  it('renders a count and caps it at max', async () => {
    const { rerender } = await render(<Badge count={5} />);
    expect(screen.getByText('5')).toBeOnTheScreen();

    await rerender(<Badge count={120} />);
    expect(screen.getByText('99+')).toBeOnTheScreen();
  });

  it('renders nothing for a zero count or an empty label', async () => {
    const { toJSON, rerender } = await render(<Badge count={0} />);
    expect(toJSON()).toBeNull();

    await rerender(<Badge />);
    expect(toJSON()).toBeNull();
  });
});
