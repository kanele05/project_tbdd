import { render, screen } from '@testing-library/react-native';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes the percentage to accessibility', async () => {
    await render(<ProgressBar percent={30} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 30 });
    expect(bar).toHaveAccessibleName('30% complete');
  });

  it('clamps out-of-range values', async () => {
    const { rerender } = await render(<ProgressBar percent={150} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);

    await rerender(<ProgressBar percent={-10} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });
});
