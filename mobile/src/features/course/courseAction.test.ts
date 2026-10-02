import {
  buildBenefits,
  COURSE_ACTION_LABEL,
  getBenefitIcon,
  getCourseAction,
  getDiscountPercent,
} from './courseAction';

const NOT_ENROLLED = { enrollment: null, priceCents: 5900, isInCart: false } as const;

describe('getCourseAction (BR-17)', () => {
  it('returns "Add to cart" for a paid course that is not in the cart', () => {
    const action = getCourseAction(NOT_ENROLLED);
    expect(action).toBe('ADD_TO_CART');
    expect(COURSE_ACTION_LABEL[action]).toBe('Add to cart');
  });

  it('returns "Go to cart" when the course is already in the cart', () => {
    const action = getCourseAction({ ...NOT_ENROLLED, isInCart: true });
    expect(COURSE_ACTION_LABEL[action]).toBe('Go to cart');
  });

  it('returns "Enroll for free" for a zero price', () => {
    const action = getCourseAction({ ...NOT_ENROLLED, priceCents: 0 });
    expect(COURSE_ACTION_LABEL[action]).toBe('Enroll for free');
  });

  it('returns "Continue learning" when enrolled, whatever the price or cart state', () => {
    const enrollment = { progressPercent: 30, lastLessonId: null };
    const action = getCourseAction({ enrollment, priceCents: 5900, isInCart: true });
    expect(COURSE_ACTION_LABEL[action]).toBe('Continue learning');
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

describe('getBenefitIcon', () => {
  it.each([
    ['14 hours on-demand video', 'video'],
    ['Native teacher', 'globe'],
    ['100% free document', 'file-text'],
    ['Full lifetime access', 'clock'],
    ['Something else', 'check-circle'],
  ])('maps "%s" to the %s icon', (text, name) => {
    expect(getBenefitIcon(text)).toEqual({ family: 'feather', name });
  });

  it('maps support to the double check of Ionicons', () => {
    expect(getBenefitIcon('24/7 support')).toEqual({ family: 'ionicons', name: 'checkmark-done' });
  });
});
