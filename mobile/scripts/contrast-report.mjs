/**
 * Prints the WCAG contrast table of both palettes (Markdown) and exits 1 when a required pair fails
 * (every TEXT pair >= 4,5:1 in BOTH palettes, and every icon/graphic pair >= 3:1 in the dark one;
 * the light palette's graphic pairs below 3:1 are brand fills and are printed as "exempt").
 *
 *   npm run check:contrast            # table on stdout
 *   npm run check:contrast > out.md   # save it (notes/dark-theme.md)
 *
 * Loads the TypeScript sources through Node's built-in type stripping (Node >= 22.18 / 24).
 */
import { ALL_PAIRS, evaluatePairs } from '../src/theme/contrast.ts';
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
}

if (hasFailure) {
  console.error('\nSome required pairs do not reach their minimum contrast.');
  process.exit(1);
}
