import { parseTabParam } from './tabs';

describe('parseTabParam', () => {
  it('accepts the three tab keys', () => {
    expect(parseTabParam('all')).toBe('all');
    expect(parseTabParam('ongoing')).toBe('ongoing');
    expect(parseTabParam('completed')).toBe('completed');
  });

  it('takes the first value of an array', () => {
    expect(parseTabParam(['completed', 'all'])).toBe('completed');
  });

  it('returns null for anything else', () => {
    expect(parseTabParam('archived')).toBeNull();
    expect(parseTabParam(undefined)).toBeNull();
    expect(parseTabParam([])).toBeNull();
  });
});
