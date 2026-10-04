/** Short all-caps words that must stay upper case when a shouting title is softened. */
const ACRONYMS = new Set([
  'UX',
  'UI',
  'AI',
  'IT',
  'QA',
  'VR',
  'AR',
  'SQL',
  'PHP',
  'API',
  'SEO',
  'CSS',
  'HTML',
  'JS',
  'IELTS',
  'TOEIC',
  '3D',
]);

function hasLowercaseLetter(text: string): boolean {
  return text !== text.toUpperCase();
}

/**
 * Banner titles and CTAs come from the server in capitals ("PROJECT MANAGEMENT", "JOIN NOW"). The
 * Noir hero is a large serif title, where shouting looks wrong: turn an all-caps text into
 * sentence case ("Project management") and keep known acronyms ("Master UX design"). Text that
 * already has lowercase letters is returned untouched.
 */
export function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '' || hasLowercaseLetter(trimmed)) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word;
      const lower = word.toLowerCase();
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}
