import { makeCourse } from '@/components/course/courseFixtures';
import { makeHome } from '@/features/search/testUtils';

import { buildBillboards } from './billboards';

describe('buildBillboards', () => {
  it('turns a course banner into a billboard carrying the course we already have', () => {
    const popular = makeCourse({ id: 'pop-1', title: 'PHP in One Click' });
    const home = makeHome({
      popular: [popular],
      banners: [
        {
          id: 'ban_1',
          title: 'MASTER UX DESIGN',
          subtitle: '20% OFF',
          ctaText: 'JOIN NOW',
          imageUrl: 'https://example.com/b.png',
          bgColor: '#000000',
          target: { type: 'COURSE', id: 'pop-1' },
        },
      ],
    });

    expect(buildBillboards(home, 'Featured')).toEqual([
      {
        id: 'ban_1',
        imageUrl: 'https://example.com/b.png',
        tag: '20% OFF',
        title: 'Master UX design',
        course: popular,
        courseId: 'pop-1',
        categoryId: null,
      },
    ]);
  });

  it('keeps a category banner without a course', () => {
    const [billboard] = buildBillboards(makeHome(), 'Featured');
    expect(billboard).toMatchObject({ courseId: null, course: null, categoryId: 'cat_business' });
  });

  it('caps the pages at five', () => {
    const banner = makeHome().banners[0]!;
    const banners = Array.from({ length: 8 }, (_, index) => ({ ...banner, id: `b${index}` }));
    expect(buildBillboards(makeHome({ banners }), 'Featured')).toHaveLength(5);
  });

  it('falls back to the most popular course, then to nothing', () => {
    const withCourse = buildBillboards(makeHome({ banners: [] }), 'Featured');
    expect(withCourse).toHaveLength(1);
    expect(withCourse[0]).toMatchObject({ courseId: 'pop-1', tag: 'Featured' });

    expect(buildBillboards(makeHome({ banners: [], popular: [] }), 'Featured')).toEqual([]);
  });
});
