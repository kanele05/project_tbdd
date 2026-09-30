import { fireEvent, render, screen } from '@testing-library/react-native';

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
