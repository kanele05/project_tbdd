import { getCategoryColor, toFeatherIcon } from './categoryIcon';

describe('getCategoryColor', () => {
  it('prefers the color sent by the API', () => {
    expect(getCategoryColor({ name: 'Code', color: '#123456' }, '#abcdef')).toBe('#123456');
  });

  it('falls back to the design color of a known category name', () => {
    expect(getCategoryColor({ name: 'Code', color: '' }, '#abcdef')).not.toBe('#abcdef');
  });

  it('falls back to the given accent for an unknown category', () => {
    expect(getCategoryColor({ name: 'Cooking', color: '' }, '#abcdef')).toBe('#abcdef');
  });
});

describe('toFeatherIcon', () => {
  it('keeps a Feather icon name and replaces an unknown one', () => {
    expect(toFeatherIcon('code')).toBe('code');
    expect(toFeatherIcon('not-an-icon')).toBe('book-open');
  });
});
