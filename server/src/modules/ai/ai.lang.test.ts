import { parseAcceptLanguage, resolveLang } from './ai.lang';

describe('parseAcceptLanguage', () => {
  it('picks the supported language with the highest q', () => {
    expect(parseAcceptLanguage('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
    expect(parseAcceptLanguage('en-US,en;q=0.9,vi;q=0.8')).toBe('en');
    expect(parseAcceptLanguage('fr-FR, vi;q=0.6, en;q=0.3')).toBe('vi');
  });

  it('prefers the earlier tag when weights are equal', () => {
    expect(parseAcceptLanguage('vi, en')).toBe('vi');
    expect(parseAcceptLanguage('en, vi')).toBe('en');
  });

  it('is case-insensitive and ignores region subtags', () => {
    expect(parseAcceptLanguage('VI-vn')).toBe('vi');
  });

  it('ignores unsupported languages, wildcards and q=0', () => {
    expect(parseAcceptLanguage('fr-FR,de;q=0.8,*;q=0.1')).toBeUndefined();
    expect(parseAcceptLanguage('vi;q=0, en;q=0.5')).toBe('en');
  });

  it('returns undefined for a missing or empty header', () => {
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
    expect(parseAcceptLanguage('')).toBeUndefined();
  });
});

describe('resolveLang', () => {
  it('query beats header, header beats default, default is en', () => {
    expect(resolveLang('vi', 'en-US')).toBe('vi');
    expect(resolveLang(undefined, 'vi-VN')).toBe('vi');
    expect(resolveLang(undefined, 'fr')).toBe('en');
    expect(resolveLang(undefined, undefined)).toBe('en');
  });
});
