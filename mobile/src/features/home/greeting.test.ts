import { getGivenName } from './greeting';

describe('getGivenName', () => {
  it('uses the last word of the full name', () => {
    expect(getGivenName('Martha Rosie')).toBe('Rosie');
    expect(getGivenName('Nguyen Van An')).toBe('An');
  });

  it('returns a single-word name as is and ignores extra spaces', () => {
    expect(getGivenName('Rosie')).toBe('Rosie');
    expect(getGivenName('  Martha   Rosie  ')).toBe('Rosie');
  });

  it('returns an empty string without a name', () => {
    expect(getGivenName('')).toBe('');
    expect(getGivenName('   ')).toBe('');
    expect(getGivenName(null)).toBe('');
    expect(getGivenName(undefined)).toBe('');
  });
});
