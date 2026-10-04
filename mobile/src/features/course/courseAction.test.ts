import { i18n } from '@/i18n';

import {
  buildBenefits,
  getCourseActionLabel,
  getCourseAction,
  getDiscountPercent,
} from './courseAction';

const NOT_ENROLLED = { enrollment: null, priceCents: 5900, isInCart: false } as const;

describe('getCourseAction (BR-17)', () => {
  it('returns "Add to cart" for a paid course that is not in the cart', () => {
    const action = getCourseAction(NOT_ENROLLED);
    expect(action).toBe('ADD_TO_CART');
    expect(getCourseActionLabel(action)).toBe('Add to cart');
  });

  it('returns "Go to cart" when the course is already in the cart', () => {
    const action = getCourseAction({ ...NOT_ENROLLED, isInCart: true });
    expect(getCourseActionLabel(action)).toBe('Go to cart');
  });

  it('returns "Enroll for free" for a zero price', () => {
    const action = getCourseAction({ ...NOT_ENROLLED, priceCents: 0 });
    expect(getCourseActionLabel(action)).toBe('Enroll for free');
  });

  it('returns "Continue learning" when enrolled, whatever the price or cart state', () => {
    const enrollment = { progressPercent: 30, lastLessonId: null };
    const action = getCourseAction({ enrollment, priceCents: 5900, isInCart: true });
    expect(getCourseActionLabel(action)).toBe('Continue learning');
    expect(getCourseAction({ enrollment, priceCents: 0, isInCart: false })).toBe('CONTINUE');
  });
});

describe('getDiscountPercent (BR-10 / BR-18)', () => {
  it('computes round((1 - price / original) * 100) instead of trusting design data', () => {
    expect(getDiscountPercent({ priceCents: 5900, originalPriceCents: 7375 })).toBe(20);
    expect(getDiscountPercent({ priceCents: 2500, originalPriceCents: 10200 })).toBe(75);
  });

  it('is 0 without a higher original price', () => {
    expect(getDiscountPercent({ priceCents: 5900, originalPriceCents: null })).toBe(0);
    expect(getDiscountPercent({ priceCents: 5900, originalPriceCents: 5900 })).toBe(0);
  });
});

describe('buildBenefits', () => {
  it('puts the video hours (from totalDurationSec) first and keeps the other benefits', () => {
    const benefits = buildBenefits({
      totalDurationSec: 14 * 3600,
      benefits: ['Native teacher', '100% free document', 'Full lifetime access', '24/7 support'],
    });
    expect(benefits).toEqual([
      '14 hours on-demand video',
      'Native teacher',
      '100% free document',
      'Full lifetime access',
      '24/7 support',
    ]);
  });

  it('drops a server video line and any certificate line (BR-18)', () => {
    const benefits = buildBenefits({
      totalDurationSec: 2 * 3600,
      benefits: ['10 hours on-demand video', 'Certificate of complete', 'Native teacher'],
    });
    expect(benefits).toEqual(['2 hours on-demand video', 'Native teacher']);
  });

  it('omits the video line when the course has no duration', () => {
    expect(buildBenefits({ totalDurationSec: 0, benefits: ['Native teacher'] })).toEqual([
      'Native teacher',
    ]);
  });
});

describe('translations', () => {
  it('returns the Vietnamese labels and video benefit after a language change', async () => {
    await i18n.changeLanguage('vi');
    expect(getCourseActionLabel('ADD_TO_CART')).toBe('Thêm vào giỏ');
    expect(buildBenefits({ totalDurationSec: 2 * 3600, benefits: [] })).toEqual([
      '2 giờ video xem mọi lúc',
    ]);
  });
});
