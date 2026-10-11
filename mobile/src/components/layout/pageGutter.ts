import { PAGE_MAX_WIDTH } from './desktopLayout';

/** `PageContainer` pads both sides with 4 % of the window width (Netflix web). */
export const PAGE_GUTTER_RATIO = 0.04;

/** Rail breakpoints: how many cards fit one row at a given window width (PLAN §2.5). */
const RAIL_STEPS: readonly (readonly [minWidth: number, visible: number])[] = [
  [1400, 6],
  [1100, 5],
  [900, 4],
  [0, 3],
];

/**
 * Distance (dp) from the window's left edge to the content edge of a `PageContainer` page, so a
 * full-bleed rail can start its first card exactly where the page title starts.
 */
export function getPageGutter(viewportWidth: number): number {
  if (viewportWidth <= 0) return 0;
  const centering = Math.max(0, (viewportWidth - PAGE_MAX_WIDTH) / 2);
  return Math.round(centering + viewportWidth * PAGE_GUTTER_RATIO);
}

export type RailMetrics = {
  /** Cards visible at once. */
  visible: number;
  /** Page gutter on each side. */
  gutter: number;
  /** Width of one card. */
  itemWidth: number;
};

/** Pure sizing of a Netflix row for a viewport: 6 cards at 1440, fewer when narrower. */
export function getRailMetrics(viewportWidth: number, gap: number, extraColumns = 0): RailMetrics {
  const step = RAIL_STEPS.find(([minWidth]) => viewportWidth >= minWidth) ?? RAIL_STEPS[3];
  const visible = Math.max(2, (step?.[1] ?? 3) + extraColumns);
  const gutter = getPageGutter(viewportWidth);
  const inner = Math.max(0, viewportWidth - gutter * 2);
  const itemWidth = Math.max(120, Math.floor((inner - gap * (visible - 1)) / visible));
  return { visible, gutter, itemWidth };
}
