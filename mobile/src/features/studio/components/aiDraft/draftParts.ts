export type DraftPart = 'category' | 'subtitle' | 'description' | 'benefits' | 'outline';

export const ALL_PARTS: readonly DraftPart[] = [
  'category',
  'subtitle',
  'description',
  'benefits',
  'outline',
];
/** Scope "text" ("Help me write"): only what the Intro step writes. */
export const TEXT_PARTS: readonly DraftPart[] = ['subtitle', 'description'];
