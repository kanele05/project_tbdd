import { fireEvent, render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { lightPalette, radius } from '@/theme';

import { Chip } from './Chip';

describe('Chip', () => {
  it('renders the label and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Javascript" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Javascript' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks a selected chip as selected for screen readers', async () => {
    await render(<Chip label="All" selected leftIcon="star" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
  });

  it('is a static label without onPress', async () => {
    await render(<Chip label="Top-rated" />);
    expect(screen.getByText('Top-rated')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Top-rated' })).not.toBeOnTheScreen();
  });
});

describe('Chip (concept B)', () => {
  it('tints a selected chip with the accent (soft fill, accent border and text)', async () => {
    await renderWithProviders(<Chip label="Code" selected onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Code' })).toHaveStyle({
      backgroundColor: lightPalette.primarySoft,
      borderColor: lightPalette.primaryText,
    });
    expect(screen.getByText('Code')).toHaveStyle({ color: lightPalette.primaryText });
  });

  it('draws an unselected chip as a hairline pill with normal text', async () => {
    await renderWithProviders(<Chip label="Design" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Design' })).toHaveStyle({
      borderColor: lightPalette.border,
      borderRadius: radius.pill,
    });
    expect(screen.getByText('Design')).toHaveStyle({ color: lightPalette.text });
  });

  it('fills a `filled` chip with neon and a dark label', async () => {
    await renderWithProviders(<Chip label="New" variant="filled" />);
    expect(screen.getByText('New')).toHaveStyle({ color: lightPalette.onPrimary });
  });
});
