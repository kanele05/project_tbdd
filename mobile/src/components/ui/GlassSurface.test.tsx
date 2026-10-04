import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { GLASS_ALPHA, darkPalette, lightPalette, radius, withAlpha } from '@/theme';

import { GlassSurface } from './GlassSurface';

/** Every direct style of the nodes that carry a `backgroundColor`. */
function fills(): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const element = node as { props?: { style?: unknown }; children?: unknown[] };
    const style = StyleSheet.flatten(element.props?.style as never) as
      { backgroundColor?: string } | undefined;
    if (style?.backgroundColor) found.push(style.backgroundColor);
    element.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

describe('GlassSurface', () => {
  it('renders its children over the glass', async () => {
    await renderWithProviders(
      <GlassSurface>
        <Text>Inside glass</Text>
      </GlassSurface>,
    );
    expect(screen.getByText('Inside glass')).toBeOnTheScreen();
  });

  it('lays the themed fill (tabBar token at GLASS_ALPHA) over the blur in light and dark', async () => {
    const { unmount } = await renderWithProviders(<GlassSurface />, { theme: 'light' });
    expect(fills()).toContain(withAlpha(lightPalette.tabBar, GLASS_ALPHA));
    unmount();

    await renderWithProviders(<GlassSurface />, { theme: 'dark' });
    expect(fills()).toContain(withAlpha(darkPalette.tabBar, GLASS_ALPHA));
  });

  it('keeps `photo` glass dark in light mode (a white glyph must read on any photograph)', async () => {
    await renderWithProviders(<GlassSurface tone="photo" />, { theme: 'light' });
    expect(fills()).toContain('rgba(8, 8, 12, 0.45)');
  });

  it('defaults to the floating-bar radius and can drop the hairline', async () => {
    await renderWithProviders(<GlassSurface testID="glass" isBordered={false} />);
    const outer = StyleSheet.flatten(screen.getByTestId('glass').props.style);
    expect(outer.borderRadius).toBe(radius.bar);
  });
});
