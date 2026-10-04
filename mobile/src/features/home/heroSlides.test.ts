import { makeCourse } from '@/components/course/courseFixtures';
import { makeHome } from '@/features/search/testUtils';

import { buildHeroSlides } from './heroSlides';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

const LABELS = { featuredTag: 'Featured', viewCourse: 'View course' };

describe('buildHeroSlides', () => {
  it('makes one slide per banner with a sentence-case title and CTA', () => {
    const slides = buildHeroSlides(makeHome(), LABELS);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      id: 'ban_1',
      tag: '20% OFF',
      title: 'Project management',
      ctaLabel: 'Join now',
      ctaAccessibilityLabel: 'Join now, Project management',
      backgroundColor: '#8353E2',
    });
  });

  it('falls back to the most popular course when there is no banner', () => {
    const popular = makeCourse({ id: 'pop-9', title: 'Top Course', badge: 'BEST_SELLER' });
    const slides = buildHeroSlides(makeHome({ banners: [], popular: [popular] }), LABELS);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      id: 'pop-9',
      title: 'Top Course',
      tag: 'Best-seller',
      ctaLabel: 'View course',
    });
  });

  it('tags the fallback course as featured when it has no badge', () => {
    const slides = buildHeroSlides(makeHome({ banners: [] }), LABELS);
    expect(slides[0]?.tag).toBe('Featured');
  });

  it('returns no slide when there is neither a banner nor a popular course', () => {
    expect(buildHeroSlides(makeHome({ banners: [], popular: [] }), LABELS)).toEqual([]);
  });
});
