import { render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';

import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('shows a single price without discount', async () => {
    await render(<PriceTag priceCents={5900} />);
    expect(screen.getByText('$59')).toBeOnTheScreen();
  });

  it('shows the struck-through original price when discounted', async () => {
    await render(<PriceTag priceCents={5900} originalPriceCents={7375} />);
    expect(screen.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('$73.75')).toBeOnTheScreen();
    expect(screen.getByLabelText('$59, was $73.75')).toBeOnTheScreen();
  });

  it('shows Free for a zero price', async () => {
    await render(<PriceTag priceCents={0} />);
    expect(screen.getByText('Free')).toBeOnTheScreen();
  });

  it('renders the stacked layout used by the details bottom bar', async () => {
    await render(
      <PriceTag
        priceCents={5900}
        originalPriceCents={7375}
        layout="stacked"
        discountPercent={20}
      />,
    );
    expect(screen.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('20% Disc.')).toBeOnTheScreen();
    expect(screen.getByText('$73.75')).toBeOnTheScreen();
  });
});

describe('PriceTag stacked (concept B)', () => {
  it('shows a serif price with the discount in gold text and the original struck through', async () => {
    await renderWithProviders(
      <PriceTag
        priceCents={4999}
        originalPriceCents={8999}
        layout="stacked"
        discountPercent={44}
      />,
      { theme: 'dark' },
    );
    expect(screen.getByText('$49.99')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: 26,
    });
    expect(screen.getByText('44% Disc.')).toHaveStyle({ color: darkPalette.goldText });
    expect(screen.getByText('$89.99')).toHaveStyle({ textDecorationLine: 'line-through' });
  });
});
