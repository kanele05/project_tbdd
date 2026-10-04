import { resolveLang } from './lang';

describe('resolveLang', () => {
  it('prefers a valid explicit language over the header', () => {
    expect(resolveLang('vi', 'en-US,en;q=0.9')).toBe('vi');
    expect(resolveLang('en', 'vi')).toBe('en');
  });

  it('ignores an unsupported explicit language and falls back to the header', () => {
    expect(resolveLang('fr', 'vi-VN,vi;q=0.9')).toBe('vi');
  });

  it('matches the primary subtag of Accept-Language', () => {
    expect(resolveLang(undefined, 'vi-VN')).toBe('vi');
    expect(resolveLang(null, 'en-GB')).toBe('en');
  });

  it('honours q values and order', () => {
    expect(resolveLang(undefined, 'fr;q=0.9,en;q=0.5,vi;q=0.8')).toBe('vi');
    expect(resolveLang(undefined, 'en;q=0.4, vi;q=0.8')).toBe('vi');
    expect(resolveLang(undefined, 'vi,en')).toBe('vi');
    expect(resolveLang(undefined, 'en,vi')).toBe('en');
  });

  it('skips languages with q=0 and unsupported ones', () => {
    expect(resolveLang(undefined, 'vi;q=0, en;q=0.1')).toBe('en');
    expect(resolveLang(undefined, 'fr-FR,de')).toBe('en');
  });

  it('defaults to English without information', () => {
    expect(resolveLang()).toBe('en');
    expect(resolveLang(undefined, '')).toBe('en');
    expect(resolveLang(undefined, '*')).toBe('en');
  });
});
