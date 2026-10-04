import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { radius } from '@/theme';

import { HeroImage } from './HeroImage';

describe('HeroImage', () => {
  it('renders the top row and the content over the photo', async () => {
    await renderWithProviders(
      <HeroImage uri="https://example.com/hero.jpg" top={<Text>Top row</Text>}>
        <Text>Hero title</Text>
      </HeroImage>,
    );
    expect(screen.getByText('Top row')).toBeOnTheScreen();
    expect(screen.getByText('Hero title')).toBeOnTheScreen();
  });

  it('is full-bleed with the requested height', async () => {
    await renderWithProviders(<HeroImage testID="hero" height={480} />);
    const style = StyleSheet.flatten(screen.getByTestId('hero').props.style);
    expect(style.height).toBe(480);
  });

  it('rounds the bottom corners in light mode only (the dark scrim melts into the page)', async () => {
    const { unmount } = await renderWithProviders(<HeroImage testID="hero" />, {
      theme: 'light',
    });
    expect(StyleSheet.flatten(screen.getByTestId('hero').props.style)).toMatchObject({
      borderBottomLeftRadius: radius.sheet,
      borderBottomRightRadius: radius.sheet,
    });
    unmount();

    await renderWithProviders(<HeroImage testID="hero" />, { theme: 'dark' });
    expect(StyleSheet.flatten(screen.getByTestId('hero').props.style).borderBottomLeftRadius).toBe(
      undefined,
    );
  });

  it('can force the rounded bottom on or off', async () => {
    await renderWithProviders(<HeroImage testID="hero" isRoundedBottom />, { theme: 'dark' });
    expect(StyleSheet.flatten(screen.getByTestId('hero').props.style).borderBottomLeftRadius).toBe(
      radius.sheet,
    );
  });

  it('describes the photo only when a label is given (decorative otherwise)', async () => {
    await renderWithProviders(
      <HeroImage uri="https://example.com/a.jpg" testID="hero" imageLabel="Course cover" />,
    );
    expect(screen.getByLabelText('Course cover')).toBeOnTheScreen();
  });
});
