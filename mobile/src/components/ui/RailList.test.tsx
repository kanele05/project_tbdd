import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { RailList } from './RailList';

const DATA = [
  { id: 'a', name: 'React Native' },
  { id: 'b', name: 'Python' },
  { id: 'c', name: 'Design' },
] as const;

function renderRail(extra: Partial<Parameters<typeof RailList<(typeof DATA)[number]>>[0]> = {}) {
  return renderWithProviders(
    <RailList
      title="Picked for you"
      data={DATA}
      keyExtractor={(item) => item.id}
      renderItem={(item) => <Text>{item.name}</Text>}
      {...extra}
    />,
  );
}

describe('RailList', () => {
  it('renders the serif header and every item', async () => {
    await renderRail();
    expect(screen.getByRole('header', { name: 'Picked for you' })).toBeOnTheScreen();
    expect(screen.getByText('React Native')).toBeOnTheScreen();
    expect(screen.getByText('Python')).toBeOnTheScreen();
    expect(screen.getByText('Design')).toBeOnTheScreen();
  });

  it('shows the "View more" link only when onViewMore is given', async () => {
    const onViewMore = jest.fn();
    const { unmount } = await renderRail();
    expect(screen.queryByRole('link')).not.toBeOnTheScreen();
    unmount();

    await renderRail({ onViewMore });
    await fireEvent.press(screen.getByRole('link', { name: 'View more, Picked for you' }));
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });

  it('renders a bare list without a title', async () => {
    await renderRail({ title: undefined });
    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
    expect(screen.getByText('Python')).toBeOnTheScreen();
  });

  it('shows the empty fallback instead of the rail', async () => {
    await renderRail({ data: [], empty: <Text>Nothing yet</Text> });
    expect(screen.getByText('Nothing yet')).toBeOnTheScreen();
  });
});
