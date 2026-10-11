import {
  countLessons,
  countPreviews,
  curriculumSignature,
  fromPayload,
  fromSections,
  moveItem,
  toRevisionSections,
  totalDurationSec,
} from './curriculumModel';
import { makeLesson, makeSection } from './studioFixtures';

describe('moveItem', () => {
  it('swaps with the neighbour and ignores moves off either end', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = ['a', 'b'];
    moveItem(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('curriculum conversions', () => {
  const sections = [
    makeSection({
      lessons: [
        makeLesson({ id: 'l1', durationSec: 100, isPreview: true }),
        makeLesson({ id: 'l2', durationSec: 200 }),
      ],
    }),
  ];

  it('counts lessons, previews and total length', () => {
    const editable = fromSections(sections);
    expect(countLessons(editable)).toBe(2);
    expect(countPreviews(editable)).toBe(1);
    expect(totalDurationSec(editable)).toBe(300);
  });

  it('round-trips a server curriculum through the revision payload shape', () => {
    const editable = fromSections(sections);
    const payloadSections = toRevisionSections(editable).map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({ ...lesson, content: lesson.content ?? '' })),
    }));
    expect(payloadSections[0]?.id).toBe('section-1');
    expect(payloadSections[0]?.lessons.map((l) => l.id)).toEqual(['l1', 'l2']);
    const back = fromPayload({
      title: 't',
      priceCents: 0,
      originalPriceCents: null,
      categoryId: 'c',
      tagIds: [],
      sections: payloadSections,
    });
    expect(curriculumSignature(back)).toBe(curriculumSignature(editable));
  });

  it('gives items without an id a fresh key and leaves the id out of the payload', () => {
    const editable = fromPayload({
      title: 't',
      priceCents: 0,
      originalPriceCents: null,
      categoryId: 'c',
      tagIds: [],
      sections: [
        {
          title: 'New section',
          lessons: [{ title: 'L', videoUrl: 'u', durationSec: 5, isPreview: false, content: '' }],
        },
      ],
    });
    expect(editable[0]?.key).toMatch(/^new-\d+$/);
    expect(editable[0]?.id).toBeUndefined();
    expect(toRevisionSections(editable)[0]).not.toHaveProperty('id');
  });
});
