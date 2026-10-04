import {
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  EXIT_MS,
  EXIT_START_MS,
  LETTERS_START_MS,
  LETTER_MS,
  LETTER_STAGGER_MS,
  progressOf,
  TOTAL_MS,
} from './introTimeline';

describe('introTimeline', () => {
  it('lasts between 1.6 and 2.2 seconds in total', () => {
    expect(TOTAL_MS).toBe(EXIT_START_MS + EXIT_MS);
    expect(TOTAL_MS).toBeGreaterThanOrEqual(1600);
    expect(TOTAL_MS).toBeLessThanOrEqual(2200);
  });

  it('has revealed every letter and the dot (7 items) before the exit starts', () => {
    const lastStart = LETTERS_START_MS + 6 * LETTER_STAGGER_MS;
    expect(lastStart + LETTER_MS).toBeLessThanOrEqual(EXIT_START_MS);
  });

  it('clamps progress to 0..1', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
    expect(progressOf(50, 100, 200)).toBe(0);
    expect(progressOf(200, 100, 200)).toBe(0.5);
    expect(progressOf(900, 100, 200)).toBe(1);
  });

  it.each([easeInCubic, easeOutCubic, easeInOutCubic])('eases from 0 to 1', (ease) => {
    expect(ease(0)).toBeCloseTo(0);
    expect(ease(1)).toBeCloseTo(1);
    expect(ease(0.5)).toBeGreaterThan(0);
    expect(ease(0.5)).toBeLessThan(1);
  });
});
