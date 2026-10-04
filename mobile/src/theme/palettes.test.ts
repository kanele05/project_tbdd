import {
  ALL_PAIRS,
  GLASS_ALPHA,
  GRAPHIC_PAIRS,
  TEXT_PAIRS,
  blendHex,
  contrastRatio,
  evaluateGlassPairs,
  evaluatePairs,
} from './contrast';
import { NON_HEX_TOKENS, darkPalette, lightPalette, type Palette } from './palettes';

const HEX = /^#[0-9A-Fa-f]{6}$/;

function hexTokens(palette: Palette): [string, string][] {
  return Object.entries(palette).filter(
    ([token]) => !(NON_HEX_TOKENS as readonly string[]).includes(token),
  );
}

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#00788A', '#FFFFFF')).toBeCloseTo(5.18, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#171A1F', '#00BDD6')).toBeCloseTo(contrastRatio('#00BDD6', '#171A1F'), 6);
  });
});

describe('blendHex', () => {
  it('mixes a color over another with the given opacity', () => {
    expect(blendHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(blendHex('#13131A', '#FFFFFF', 1)).toBe('#13131A');
    expect(blendHex('#13131A', '#000000', 0)).toBe('#000000');
  });
});

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
])('%s palette', (_name, palette) => {
  it('defines a valid color for every token', () => {
    for (const [token, value] of hexTokens(palette)) {
      expect({ token, isHex: HEX.test(value) }).toEqual({ token, isHex: true });
    }
  });

  it.each(TEXT_PAIRS.map((pair) => [`${pair.fg} on ${pair.bg}`, pair] as const))(
    'text %s reaches WCAG AA (4.5:1)',
    (_label, pair) => {
      expect(contrastRatio(palette[pair.fg], palette[pair.bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps text readable on floating glass over white and over black (no real blur on Android)', () => {
    const results = evaluateGlassPairs(palette);
    expect(results.length).toBeGreaterThanOrEqual(6);
    for (const result of results) {
      expect({ ...result, ok: result.ratio >= 4.5 }).toMatchObject({ ok: true });
    }
  });
});

describe('dark palette graphics', () => {
  it.each(GRAPHIC_PAIRS.map((pair) => [`${pair.fg} on ${pair.bg}`, pair] as const))(
    '%s reaches 3:1',
    (_label, pair) => {
      expect(contrastRatio(darkPalette[pair.fg], darkPalette[pair.bg])).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('palettes', () => {
  it('expose exactly the same tokens', () => {
    expect(Object.keys(darkPalette).sort()).toEqual(Object.keys(lightPalette).sort());
  });

  it('use the concept B accents: neon cyan (dark) and champagne gold', () => {
    expect(darkPalette.primary).toBe('#2EF2FF');
    expect(darkPalette.background).toBe('#08080C');
    expect(lightPalette.background).toBe('#F5F2EA');
    expect(darkPalette.gold).toBe('#E9C77B');
    expect(darkPalette.star).toBe(darkPalette.gold);
  });

  it('keep the documented text ratios of concept B (notes/design-system-b.md)', () => {
    const byKey = (palette: Palette) =>
      new Map(evaluatePairs(palette, ALL_PAIRS).map((r) => [`${r.fg}/${r.bg}`, r.ratio]));
    const light = byKey(lightPalette);
    const dark = byKey(darkPalette);
    expect(light.get('text/background')).toBeCloseTo(17.33, 2);
    expect(light.get('textMuted/background')).toBeCloseTo(6.29, 2);
    expect(light.get('primaryText/background')).toBeCloseTo(5.56, 2);
    expect(light.get('dangerText/background')).toBeCloseTo(5.84, 2);
    expect(dark.get('text/background')).toBeCloseTo(17.91, 2);
    expect(dark.get('primaryText/background')).toBeCloseTo(14.53, 2);
    expect(dark.get('onPrimary/primary')).toBeCloseTo(13.69, 2);
  });

  it('use a translucent glass opacity below 1', () => {
    expect(GLASS_ALPHA).toBeGreaterThan(0.7);
    expect(GLASS_ALPHA).toBeLessThan(1);
  });
});
