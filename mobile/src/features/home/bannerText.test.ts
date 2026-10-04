import { toSentenceCase } from './bannerText';

describe('toSentenceCase', () => {
  it('turns an all-caps title into sentence case', () => {
    expect(toSentenceCase('PROJECT MANAGEMENT')).toBe('Project management');
    expect(toSentenceCase('JOIN NOW')).toBe('Join now');
    expect(toSentenceCase('LEARN TO CODE')).toBe('Learn to code');
  });

  it('keeps known acronyms in capitals', () => {
    expect(toSentenceCase('MASTER UX DESIGN')).toBe('Master UX design');
    expect(toSentenceCase('UI BASICS')).toBe('UI basics');
  });

  it('leaves text that already has lowercase letters untouched', () => {
    expect(toSentenceCase('Learn Python in a day')).toBe('Learn Python in a day');
  });

  it('trims and handles an empty text', () => {
    expect(toSentenceCase('  EXPLORE  ')).toBe('Explore');
    expect(toSentenceCase('')).toBe('');
  });
});
