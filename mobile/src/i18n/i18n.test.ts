import { getLocales } from 'expo-localization';

import { formatDuration, formatTotalHours } from '@/utils/formatDuration';
import { formatPrice, formatPriceOrFree } from '@/utils/formatPrice';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { formatDate, formatNumber } from './format';
import {
  applyLanguage,
  getCurrentLanguage,
  getDeviceLanguage,
  getLocaleTag,
  hasTranslation,
  i18n,
  resolveLanguage,
  tr,
} from './index';

const mockGetLocales = getLocales as jest.Mock;

function setDeviceLanguage(languageCode: string) {
  mockGetLocales.mockReturnValue([{ languageCode, languageTag: `${languageCode}-XX` }]);
}

afterEach(() => {
  setDeviceLanguage('en');
});

describe('device language detection', () => {
  it('picks Vietnamese on a Vietnamese device', () => {
    setDeviceLanguage('vi');
    expect(getDeviceLanguage()).toBe('vi');
    expect(resolveLanguage('system')).toBe('vi');
  });

  it.each(['en', 'fr', 'ja', 'de'])('uses English on a "%s" device', (code) => {
    setDeviceLanguage(code);
    expect(getDeviceLanguage()).toBe('en');
    expect(resolveLanguage('system')).toBe('en');
  });

  it('uses English when the locale cannot be read', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(getDeviceLanguage()).toBe('en');
  });

  it('lets an explicit preference win over the device', () => {
    setDeviceLanguage('vi');
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('vi')).toBe('vi');
  });
});

describe('translation', () => {
  it('translates into the active language', async () => {
    expect(i18n.t('auth:login')).toBe('Log in');
    await applyLanguage('vi');
    expect(i18n.t('auth:login')).toBe('Đăng nhập');
    expect(getCurrentLanguage()).toBe('vi');
    expect(getLocaleTag()).toBe('vi-VN');
  });

  it('interpolates values without escaping them', async () => {
    expect(i18n.t('common:a11y.avatarOf', { name: "Anne O'Brien & Co" })).toBe(
      "Anne O'Brien & Co's avatar",
    );
  });

  it('pluralizes in English and has a single form in Vietnamese', async () => {
    expect(i18n.t('common:lessons.count', { count: 1 })).toBe('1 lesson');
    expect(i18n.t('common:lessons.count', { count: 18 })).toBe('18 lessons');
    await applyLanguage('vi');
    expect(i18n.t('common:lessons.count', { count: 1 })).toBe('1 bài học');
    expect(i18n.t('common:lessons.count', { count: 18 })).toBe('18 bài học');
  });

  it('translates runtime keys with tr() and reports missing ones', () => {
    expect(tr('errors:codes.AI_RATE_LIMITED')).toMatch(/busy/);
    expect(hasTranslation('errors:codes.AI_RATE_LIMITED')).toBe(true);
    expect(hasTranslation('errors:codes.DOES_NOT_EXIST')).toBe(false);
  });
});

describe('<html lang> on the web', () => {
  const root: { lang?: string } = {};

  beforeEach(() => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: root },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document');
  });

  it('follows the UI language', async () => {
    await applyLanguage('vi');
    expect(root.lang).toBe('vi');
    await applyLanguage('en');
    expect(root.lang).toBe('en');
  });
});

describe('formatting follows the language', () => {
  it('formats prices (USD in both languages)', async () => {
    expect(formatPrice(102000)).toBe('$1,020');
    expect(formatPrice(7375)).toBe('$73.75');
    await applyLanguage('vi');
    expect(formatPrice(102000)).toBe('$1.020');
    expect(formatPrice(7375)).toBe('$73,75');
    expect(formatPrice(5900)).toBe('$59');
    expect(formatPriceOrFree(0)).toBe('Miễn phí');
  });

  it('formats durations', async () => {
    expect(formatDuration(8700)).toBe('2 hrs 25 mins');
    expect(formatTotalHours(14 * 3600)).toBe('14 hours');
    await applyLanguage('vi');
    expect(formatDuration(8700)).toBe('2 giờ 25 phút');
    expect(formatDuration(3600)).toBe('1 giờ');
    expect(formatTotalHours(14 * 3600)).toBe('14 giờ');
  });

  it('formats relative times with the dayjs locale', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    expect(formatRelativeTime('2026-10-15T12:00:00.000Z', now)).toBe('5 days ago');
    await applyLanguage('vi');
    expect(formatRelativeTime('2026-10-15T12:00:00.000Z', now)).toBe('5 ngày trước');
  });

  it('formats numbers and dates', async () => {
    expect(formatNumber(1233)).toBe('1,233');
    expect(formatDate('2026-10-20T12:00:00.000Z', { dateStyle: 'medium', timeZone: 'UTC' })).toBe(
      'Oct 20, 2026',
    );
    await applyLanguage('vi');
    expect(formatNumber(1233)).toBe('1.233');
    expect(formatDate('2026-10-20T12:00:00.000Z', { timeZone: 'UTC' })).toMatch(/2026/);
    expect(formatDate('not-a-date')).toBe('');
    expect(formatNumber(Number.NaN)).toBe('0');
  });
});
