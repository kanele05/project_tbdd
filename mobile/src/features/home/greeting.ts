/**
 * Name used in the Home greeting: the LAST word of `fullName` ("Martha Rosie" -> "Rosie"), which
 * matches both the design and Vietnamese names. Returns '' when there is no name.
 */
export function getGivenName(fullName: string | null | undefined): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? '';
}
