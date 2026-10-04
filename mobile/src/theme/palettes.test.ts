import { ALL_PAIRS, GRAPHIC_PAIRS, TEXT_PAIRS, contrastRatio, evaluatePairs } from './contrast';
import { darkPalette, lightPalette, type Palette } from './palettes';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const NON_HEX_TOKENS = new Set(['overlay', 'transparent']);

function hexTokens(palette: Palette): [string, string][] {
  return Object.entries(palette).filter(([token]) => !NON_HEX_TOKENS.has(token));
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

  it('keep the light text pairs at their documented ratios (contrast-fix W4)', () => {
    const byKey = new Map(
      evaluatePairs(lightPalette, ALL_PAIRS).map((r) => [`${r.fg}/${r.bg}`, r.ratio]),
    );
    expect(byKey.get('primaryText/background')).toBeCloseTo(5.18, 2);
    expect(byKey.get('textMuted/background')).toBeCloseTo(5.38, 2);
    expect(byKey.get('dangerText/background')).toBeCloseTo(5.27, 2);
  });
});
