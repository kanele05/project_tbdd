import { fireEvent, render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { lightPalette } from '@/theme';

import { SegmentedTabs } from './SegmentedTabs';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'review', label: 'Review' },
] as const;

describe('SegmentedTabs', () => {
  it('marks the active tab as selected', async () => {
    await render(<SegmentedTabs tabs={TABS} value="lessons" onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Lessons' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Overview' })).not.toBeSelected();
  });

  it('calls onChange with the pressed tab key', async () => {
    const onChange = jest.fn();
    await render(<SegmentedTabs tabs={TABS} value="overview" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Review' }));
    expect(onChange).toHaveBeenCalledWith('review');
  });
});

describe('SegmentedTabs (concept B)', () => {
  it('keeps sentence case by default and upper-cases only on request', async () => {
    const { rerender } = await render(
      <SegmentedTabs tabs={TABS} value="overview" onChange={jest.fn()} />,
    );
    expect(screen.getByText('Overview').props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ textTransform: 'uppercase' })]),
    );

    await rerender(<SegmentedTabs tabs={TABS} value="overview" onChange={jest.fn()} isUppercase />);
    expect(screen.getByText('Overview')).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('draws the active tab in the text color with a neon underline, the others muted', async () => {
    await renderWithProviders(<SegmentedTabs tabs={TABS} value="lessons" onChange={jest.fn()} />);
    expect(screen.getByText('Lessons')).toHaveStyle({ color: lightPalette.text });
    expect(screen.getByText('Overview')).toHaveStyle({ color: lightPalette.textMuted });
    expect(screen.getByRole('tab', { name: 'Lessons' })).toHaveStyle({
      borderBottomColor: lightPalette.primary,
    });
  });
});
