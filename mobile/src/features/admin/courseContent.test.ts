import { countLessons, getReviewedSections, sectionsFromCourse } from './courseContent';
import { makeDetail } from './testFixtures';

describe('courseContent', () => {
  it('orders sections and lessons by their order field', () => {
    const detail = makeDetail();
    const reversed = [
      {
        ...detail.sections[0]!,
        lessons: [...detail.sections[0]!.lessons].reverse(),
      },
    ];
    const sections = sectionsFromCourse(reversed);
    expect(sections[0]?.lessons.map((lesson) => lesson.key)).toEqual(['l1', 'l2']);
    expect(countLessons(sections)).toBe(2);
  });

  it('shows the live curriculum for a new course', () => {
    const sections = getReviewedSections(makeDetail());
    expect(sections[0]?.title).toBe('Basics');
  });

  it('shows the revision curriculum when a revision is pending, with keys for new items', () => {
    const detail = makeDetail({
      reviewTarget: 'REVISION',
      status: 'PUBLISHED',
      revision: {
        id: 'r1',
        status: 'PENDING_REVIEW',
        createdAt: '',
        updatedAt: '',
        submittedAt: '',
        missing: [],
        rejectionReason: null,
        payload: {
          title: 'T',
          priceCents: 0,
          originalPriceCents: null,
          categoryId: 'cat1',
          tagIds: [],
          sections: [
            {
              title: 'Fresh',
              lessons: [
                {
                  title: 'New lesson',
                  videoUrl: 'https://youtu.be/x',
                  durationSec: 60,
                  isPreview: false,
                  content: '',
                },
              ],
            },
          ],
        },
      },
    });
    const sections = getReviewedSections(detail);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe('new-section-0');
    expect(sections[0]?.lessons[0]?.key).toBe('new-lesson-0-0');
  });
});
