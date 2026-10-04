/**
 * Timeline (ms) of the launch intro. One shared value `t` runs 0 -> EXIT_START_MS, waits there
 * until the app is ready, then continues to TOTAL_MS. Every layer derives its look from `t`, so a
 * frame at any time can be reproduced (`freezeAtMs`) for screenshots and tests.
 *
 *   0 ........ 520    neon dot opens into a streak of light across the screen
 *   120 ...... 1050   thin "ribbons" of light rise behind the wordmark
 *   380 ...... 1370   letters of "elearn" + the neon dot appear one by one (stagger)
 *   1000 ..... 1550   a bright sweep crosses the wordmark
 *   1700              hold (wordmark breathes while the app is still loading)
 *   1700 ..... 2150   wordmark shrinks + fades, the black overlay fades out and reveals the app
 */
export const STREAK_MS = 520;
export const RIBBONS_START_MS = 120;
export const RIBBONS_END_MS = 1050;
export const LETTERS_START_MS = 380;
export const LETTER_STAGGER_MS = 90;
export const LETTER_MS = 450;
export const SWEEP_START_MS = 1000;
export const SWEEP_MS = 550;
export const EXIT_START_MS = 1700;
export const EXIT_MS = 450;
export const TOTAL_MS = EXIT_START_MS + EXIT_MS;

/** Reduce Motion: the wordmark just fades in (`REDUCED_FADE_MS`), stays `REDUCED_HOLD_MS`, fades out. */
export const REDUCED_FADE_MS = 250;
export const REDUCED_HOLD_MS = 600;

export function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

/** Progress (0-1) of the window `[start, start + duration]` at time `t`. */
export function progressOf(t: number, start: number, duration: number): number {
  'worklet';
  return clamp01((t - start) / duration);
}

export function easeOutCubic(p: number): number {
  'worklet';
  return 1 - Math.pow(1 - p, 3);
}

export function easeInOutCubic(p: number): number {
  'worklet';
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeInCubic(p: number): number {
  'worklet';
  return p * p * p;
}
