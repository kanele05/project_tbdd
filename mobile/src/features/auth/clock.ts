/** Wall clock in ms. Kept in one place so countdown code reads time through a plain function (and tests can mock it). */
export function nowMs(): number {
  return Date.now();
}
