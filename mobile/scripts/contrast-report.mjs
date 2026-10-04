/**
 * Prints the WCAG contrast table of both palettes (Markdown) and exits 1 when a required pair fails
 * (every TEXT pair >= 4,5:1 in BOTH palettes, every text token on floating glass over white and
 * black, and every icon/graphic pair >= 3:1 in the dark palette; the light palette's graphic pairs
 * below 3:1 are brand fills and are printed as "exempt").
 *
 *   npm run check:contrast            # table on stdout
 *   npm run check:contrast > out.md   # save it (notes/dark-theme.md)
 *
 * Loads the TypeScript sources through Node's built-in type stripping (Node >= 22.18 / 24).
 */
import {
  ALL_PAIRS,
  GLASS_ALPHA,
  evaluateGlassPairs,
  evaluatePairs,
} from '../src/theme/contrast.ts';
import { darkPalette, lightPalette } from '../src/theme/palettes.ts';

let hasFailure = false;

for (const [name, palette] of [
  ['light', lightPalette],
  ['dark', darkPalette],
]) {
  console.log(`\n### ${name}\n`);
  console.log('| Foreground | Background | Usage | FG | BG | Ratio | Min | OK |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of evaluatePairs(palette, ALL_PAIRS)) {
    const isRequired = r.min === 4.5 || name === 'dark';
    if (!r.passes && isRequired) hasFailure = true;
    const verdict = r.passes ? 'yes' : isRequired ? 'NO' : 'exempt';
    console.log(
      `| \`${r.fg}\` | \`${r.bg}\` | ${r.usage} | ${palette[r.fg]} | ${palette[r.bg]} | ${r.ratio.toFixed(2)} | ${r.min} | ${verdict} |`,
    );
  }

  console.log(`
#### ${name}: text on floating glass (tabBar at ${GLASS_ALPHA * 100} % opacity)
`);
  console.log('| Foreground | Over | Ratio | Min | OK |');
  console.log('|---|---|---|---|---|');
  for (const r of evaluateGlassPairs(palette)) {
    if (!r.passes) hasFailure = true;
    console.log(
      `| \`${r.fg}\` | ${r.over} | ${r.ratio.toFixed(2)} | 4.5 | ${r.passes ? 'yes' : 'NO'} |`,
    );
  }
}

if (hasFailure) {
  console.error('\nSome required pairs do not reach their minimum contrast.');
  process.exit(1);
}
