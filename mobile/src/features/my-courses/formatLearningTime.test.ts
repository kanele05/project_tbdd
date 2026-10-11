import { i18n } from '@/i18n';

import { formatLearningTime } from './formatLearningTime';

describe('formatLearningTime', () => {
  it('shows hours and minutes in English', () => {
    expect(formatLearningTime(22800)).toBe('6 h 20 min');
    expect(formatLearningTime(7200)).toBe('2 h');
    expect(formatLearningTime(1500)).toBe('25 min');
  });

  it('shows "< 1 min" below a minute and tolerates bad input', () => {
    expect(formatLearningTime(0)).toBe('< 1 min');
    expect(formatLearningTime(59)).toBe('< 1 min');
    expect(formatLearningTime(Number.NaN)).toBe('< 1 min');
    expect(formatLearningTime(-5)).toBe('< 1 min');
  });

  it('follows the Vietnamese language', async () => {
    await i18n.changeLanguage('vi');
    expect(formatLearningTime(22800)).toBe('6 giờ 20 phút');
    expect(formatLearningTime(30)).toBe('< 1 phút');
  });
});
