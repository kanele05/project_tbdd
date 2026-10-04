import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, fontAssets, fontFamily, typography } from '@/theme';

import { AppText } from './AppText';

describe('AppText', () => {
  it('applies the body variant and text color by default', async () => {
    await render(<AppText>Hello</AppText>);
    const style = StyleSheet.flatten(screen.getByText('Hello').props.style);
    expect(style.fontFamily).toBe(typography.body.fontFamily);
    expect(style.fontSize).toBe(15);
    expect(style.color).toBe(colors.textPrimary);
  });

  it('uses the display serif for h3 and muted color for caption', async () => {
    await render(
      <>
        <AppText variant="h3">Title</AppText>
        <AppText variant="caption">Small</AppText>
      </>,
    );
    expect(StyleSheet.flatten(screen.getByText('Title').props.style).fontFamily).toBe(
      'PlayfairDisplay_700Bold',
    );
    expect(StyleSheet.flatten(screen.getByText('Small').props.style).color).toBe(colors.textMuted);
  });

  it('supports color, family, alignment and uppercase overrides', async () => {
    await render(
      <AppText color="primary" family="bodySemiBold" align="center" uppercase>
        Tab
      </AppText>,
    );
    const style = StyleSheet.flatten(screen.getByText('Tab').props.style);
    expect(style.color).toBe(colors.primary);
    expect(style.fontFamily).toBe('BeVietnamPro_600SemiBold');
    expect(style.textAlign).toBe('center');
    expect(style.textTransform).toBe('uppercase');
  });

  it('keeps the serif for large titles only (>= 18 dp) and Be Vietnam Pro below', () => {
    const serif = ['hero', 'h1', 'h2', 'h3'] as const;
    for (const variant of serif) {
      expect(typography[variant].fontFamily).toMatch(/^PlayfairDisplay_/);
      expect(Number(typography[variant].fontSize)).toBeGreaterThanOrEqual(18);
    }
    const sans = [
      'title',
      'cardTitle',
      'bodyLarge',
      'body',
      'label',
      'caption',
      'tab',
      'micro',
    ] as const;
    for (const variant of sans) {
      expect(typography[variant].fontFamily).toMatch(/^BeVietnamPro_/);
    }
  });

  it('keeps the old heading family tokens on the sans font (small prices and names)', () => {
    expect(fontFamily.heading).toBe('BeVietnamPro_600SemiBold');
    expect(fontFamily.headingBold).toBe('BeVietnamPro_700Bold');
    expect(fontFamily.headingRegular).toBe('BeVietnamPro_400Regular');
    expect(Object.values(fontFamily).every((name) => name in fontAssets)).toBe(true);
  });

  it('leaves room for Vietnamese diacritics: line height >= 1.35 x size (1.27 from 28 dp, 1.15 from 36 dp)', () => {
    for (const style of Object.values(typography)) {
      const size = Number(style.fontSize);
      const minRatio = size >= 36 ? 1.15 : size >= 28 ? 1.27 : 1.35;
      expect(Number(style.lineHeight) / size).toBeGreaterThanOrEqual(minRatio);
    }
  });
});
