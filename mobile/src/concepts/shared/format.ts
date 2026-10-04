/** Vietnamese-style number formatting for the concept mock data. */
export function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatHours(hours: number): string {
  return `${String(hours).replace('.', ',')} giờ`;
}

export function discountPercent(priceCents: number, originalCents: number | null): number | null {
  if (!originalCents || originalCents <= priceCents) return null;
  return Math.round((1 - priceCents / originalCents) * 100);
}
