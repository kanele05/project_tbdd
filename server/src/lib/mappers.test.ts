import {
  computeBadge,
  type CourseSummaryRow,
  roundRating,
  toCategoryDto,
  toCourseSummary,
  toTagDto,
  toTeacherSummary,
  toUserDto,
} from './mappers';

function courseRow(overrides: Partial<CourseSummaryRow> = {}): CourseSummaryRow {
  return {
    id: 'course-1',
    title: 'UX Foundation',
    thumbnailUrl: 'https://images.example.com/ux.jpg',
    priceCents: 5900,
    originalPriceCents: null,
    isBestSeller: false,
    ratingAvg: 4.5,
    ratingCount: 1233,
    lessonCount: 12,
    totalDurationSec: 9000,
    teacher: { id: 'teacher-1', user: { fullName: 'Ramono Wultschner' } },
    ...overrides,
  };
}

describe('computeBadge (BR-10)', () => {
  it('returns BEST_SELLER when the course is a best seller', () => {
    expect(
      computeBadge({ isBestSeller: true, priceCents: 5900, originalPriceCents: null }),
    ).toEqual({ badge: 'BEST_SELLER', discountPercent: null });
  });

  it('prefers BEST_SELLER over DISCOUNT but still reports discountPercent', () => {
    expect(
      computeBadge({ isBestSeller: true, priceCents: 3900, originalPriceCents: 4900 }),
    ).toEqual({ badge: 'BEST_SELLER', discountPercent: 20 });
  });

  it('returns DISCOUNT with round((1 - price/original) * 100)', () => {
    expect(
      computeBadge({ isBestSeller: false, priceCents: 2900, originalPriceCents: 3625 }),
    ).toEqual({ badge: 'DISCOUNT', discountPercent: 20 });
    expect(
      computeBadge({ isBestSeller: false, priceCents: 1000, originalPriceCents: 3000 }),
    ).toEqual({ badge: 'DISCOUNT', discountPercent: 67 });
  });

  it('returns null badge when there is no discount', () => {
    expect(
      computeBadge({ isBestSeller: false, priceCents: 5900, originalPriceCents: null }),
    ).toEqual({
      badge: null,
      discountPercent: null,
    });
    expect(
      computeBadge({ isBestSeller: false, priceCents: 5900, originalPriceCents: 5900 }),
    ).toEqual({
      badge: null,
      discountPercent: null,
    });
    expect(
      computeBadge({ isBestSeller: false, priceCents: 5900, originalPriceCents: 4000 }),
    ).toEqual({
      badge: null,
      discountPercent: null,
    });
  });

  it('ignores discounts that round to 0 percent', () => {
    expect(
      computeBadge({ isBestSeller: false, priceCents: 9999, originalPriceCents: 10000 }),
    ).toEqual({ badge: null, discountPercent: null });
  });
});

describe('toCourseSummary', () => {
  it('maps a row to the CourseSummary DTO', () => {
    const dto = toCourseSummary(courseRow({ originalPriceCents: 7375, isBestSeller: true }));
    expect(dto).toEqual({
      id: 'course-1',
      title: 'UX Foundation',
      thumbnailUrl: 'https://images.example.com/ux.jpg',
      teacher: { id: 'teacher-1', fullName: 'Ramono Wultschner' },
      priceCents: 5900,
      originalPriceCents: 7375,
      badge: 'BEST_SELLER',
      discountPercent: 20,
      ratingAvg: 4.5,
      ratingCount: 1233,
      lessonCount: 12,
      totalDurationSec: 9000,
      isBookmarked: false,
    });
  });

  it('sets isBookmarked from a Set or an array of ids, false for guests', () => {
    const row = courseRow();
    expect(toCourseSummary(row).isBookmarked).toBe(false);
    expect(toCourseSummary(row, { bookmarkedIds: new Set(['course-1']) }).isBookmarked).toBe(true);
    expect(toCourseSummary(row, { bookmarkedIds: ['other', 'course-1'] }).isBookmarked).toBe(true);
    expect(toCourseSummary(row, { bookmarkedIds: new Set(['other']) }).isBookmarked).toBe(false);
  });

  it('turns relative thumbnail paths into absolute URLs', () => {
    const dto = toCourseSummary(courseRow({ thumbnailUrl: '/static/images/a.jpg' }));
    expect(dto.thumbnailUrl).toMatch(/^https?:\/\/.+\/static\/images\/a\.jpg$/);
  });
});

describe('toTeacherSummary', () => {
  const base = {
    id: 'teacher-1',
    organization: 'University of Oxford',
    user: { fullName: 'Christian Hayes', avatarUrl: 'https://img.example.com/c.jpg' },
  };

  it('averages course ratings and sums rating counts', () => {
    const dto = toTeacherSummary({
      ...base,
      courses: [
        { ratingAvg: 4.5, ratingCount: 100 },
        { ratingAvg: 4.0, ratingCount: 50 },
        { ratingAvg: 5, ratingCount: 10 },
      ],
    });
    expect(dto).toEqual({
      id: 'teacher-1',
      fullName: 'Christian Hayes',
      avatarUrl: 'https://img.example.com/c.jpg',
      organization: 'University of Oxford',
      ratingAvg: 4.5,
      ratingCount: 160,
    });
  });

  it('returns zero rating when the teacher has no rated courses', () => {
    const dto = toTeacherSummary({ ...base, user: { ...base.user, avatarUrl: null }, courses: [] });
    expect(dto.ratingAvg).toBe(0);
    expect(dto.ratingCount).toBe(0);
    expect(dto.avatarUrl).toBeNull();
  });
});

describe('toUserDto', () => {
  it('copies only the public fields (never the password hash)', () => {
    const dto = toUserDto({
      id: 'u1',
      email: 'martha@example.com',
      fullName: 'Martha Rosie',
      headline: 'UX/UI Designer',
      avatarUrl: null,
      coverUrl: null,
      role: 'STUDENT',
      passwordHash: 'secret-hash',
    } as Parameters<typeof toUserDto>[0]);
    expect(dto).toEqual({
      id: 'u1',
      email: 'martha@example.com',
      fullName: 'Martha Rosie',
      headline: 'UX/UI Designer',
      avatarUrl: null,
      coverUrl: null,
      role: 'STUDENT',
    });
    expect(dto).not.toHaveProperty('passwordHash');
  });
});

describe('toCategoryDto / toTagDto / roundRating', () => {
  it('maps category with courseCount from _count', () => {
    expect(
      toCategoryDto({
        id: 'c1',
        name: 'Design',
        slug: 'design',
        icon: 'pen-tool',
        color: '#8353E2',
        _count: { courses: 9 },
      }),
    ).toEqual({
      id: 'c1',
      name: 'Design',
      slug: 'design',
      icon: 'pen-tool',
      color: '#8353E2',
      courseCount: 9,
    });
  });

  it('maps tag', () => {
    expect(toTagDto({ id: 't1', name: 'Java', isHot: true })).toEqual({
      id: 't1',
      name: 'Java',
      isHot: true,
    });
  });

  it('rounds ratings to one decimal', () => {
    expect(roundRating(4.46)).toBe(4.5);
    expect(roundRating(4.44)).toBe(4.4);
  });
});
