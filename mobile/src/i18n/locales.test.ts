import { NAMESPACES, resources } from './resources';

/**
 * Guard for everyone who adds strings: every key must exist in BOTH languages, with the same
 * `{{placeholders}}`, and nothing may be left empty. (English plural keys `_one` / `_other` are
 * compared by their base name because Vietnamese only needs `_other`.)
 */

type Tree = { readonly [key: string]: string | Tree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [childPath, text] of flatten(value, path)) entries.set(childPath, text);
  }
  return entries;
}

function baseKeys(entries: Map<string, string>): Set<string> {
  return new Set([...entries.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')));
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? '').sort();
}

describe.each(NAMESPACES)('locale namespace "%s"', (namespace) => {
  const en = flatten(resources.en[namespace] as Tree);
  const vi = flatten(resources.vi[namespace] as Tree);

  it('has the same keys in English and Vietnamese', () => {
    expect([...baseKeys(vi)].sort()).toEqual([...baseKeys(en)].sort());
  });

  it('has no empty strings', () => {
    for (const [lang, entries] of [
      ['en', en],
      ['vi', vi],
    ] as const) {
      for (const [key, text] of entries) {
        expect({ lang, key, isEmpty: text.trim() === '' }).toEqual({ lang, key, isEmpty: false });
      }
    }
  });

  it('uses the same {{placeholders}} in both languages', () => {
    for (const [key, text] of vi) {
      const enKey = en.has(key) ? key : key.replace(PLURAL_SUFFIX, '_other');
      const enText = en.get(enKey);
      if (enText === undefined) continue;
      // Only compare the "other" form: "{{count}} lesson" vs "{{count}} bài học".
      expect({ key, vars: placeholders(text) }).toEqual({ key, vars: placeholders(enText) });
    }
  });
});

describe('locale files', () => {
  it('cover every namespace in both languages', () => {
    expect(Object.keys(resources.en).sort()).toEqual([...NAMESPACES].sort());
    expect(Object.keys(resources.vi).sort()).toEqual([...NAMESPACES].sort());
  });

  it('translate every error code in both languages (incl. the AI codes)', () => {
    const codes = Object.keys(resources.en.errors.codes);
    for (const code of ['AI_RATE_LIMITED', 'AI_UNAVAILABLE', 'AI_BLOCKED', 'NETWORK_ERROR']) {
      expect(codes).toContain(code);
    }
    expect(Object.keys(resources.vi.errors.codes).sort()).toEqual([...codes].sort());
  });
});
