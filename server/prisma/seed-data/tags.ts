/** 16 tag, trong đó 7 tag "hot" hiển thị ở màn Search (PLAN §11). */
export type TagSeed = { id: string; name: string; isHot: boolean };

function tag(name: string, isHot: boolean): TagSeed {
  return { id: `tag_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name, isHot };
}

export const TAGS: readonly TagSeed[] = [
  // Hot
  tag('Java', true),
  tag('SQL', true),
  tag('Javascript', true),
  tag('Python', true),
  tag('Digital marketing', true),
  tag('Photoshop', true),
  tag('Watercolor', true),
  // Thường
  tag('PHP', false),
  tag('UX Research', false),
  tag('Figma', false),
  tag('Typography', false),
  tag('Branding', false),
  tag('Illustration', false),
  tag('Project management', false),
  tag('Video editing', false),
  tag('English', false),
];

export const tagId = (name: string): string => {
  const found = TAGS.find((t) => t.name === name);
  if (!found) throw new Error(`Unknown tag "${name}" in seed data`);
  return found.id;
};
