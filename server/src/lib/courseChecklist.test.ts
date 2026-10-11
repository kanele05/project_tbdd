import { type CourseSnapshot, getCourseMissing } from './courseChecklist';

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function validCourse(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    title: 'Learn TypeScript',
    description: 'd'.repeat(120),
    thumbnailUrl: '/uploads/courses/cover.png',
    categoryId: 'cat-1',
    priceCents: 4900,
    originalPriceCents: null,
    sections: [
      {
        lessons: [
          { id: 'l1', videoUrl: VIDEO, durationSec: 60, isPreview: true },
          { id: 'l2', videoUrl: VIDEO, durationSec: 60, isPreview: false },
          { id: 'l3', videoUrl: VIDEO, durationSec: 60, isPreview: false },
        ],
      },
    ],
    ...overrides,
  };
}

const codes = (course: CourseSnapshot) => getCourseMissing(course).map((item) => item.code);

describe('getCourseMissing (BR-20)', () => {
  it('returns nothing for a complete course', () => {
    expect(getCourseMissing(validCourse())).toEqual([]);
  });

  it('accepts a free course and a discounted course', () => {
    expect(codes(validCourse({ priceCents: 0 }))).toEqual([]);
    expect(codes(validCourse({ priceCents: 4900, originalPriceCents: 9900 }))).toEqual([]);
  });

  it('reports every missing basic field', () => {
    const result = codes(
      validCourse({ title: 'Hey', description: 'short', thumbnailUrl: '', categoryId: null }),
    );
    expect(result).toEqual([
      'TITLE_LENGTH',
      'DESCRIPTION_TOO_SHORT',
      'NO_THUMBNAIL',
      'NO_CATEGORY',
    ]);
  });

  it('requires at least one section and three lessons', () => {
    expect(codes(validCourse({ sections: [] }))).toEqual([
      'NO_SECTION',
      'NOT_ENOUGH_LESSONS',
      'PREVIEW_COUNT',
    ]);
    const two = validCourse().sections[0]?.lessons.slice(0, 2) ?? [];
    expect(codes(validCourse({ sections: [{ lessons: two }] }))).toEqual(['NOT_ENOUGH_LESSONS']);
  });

  it('flags lessons with a bad video link or duration, with their id and number', () => {
    const lessons = [
      { id: 'a', videoUrl: 'https://vimeo.com/1', durationSec: 60, isPreview: true },
      { id: 'b', videoUrl: VIDEO, durationSec: 0, isPreview: false },
      { videoUrl: VIDEO, durationSec: 6 * 3600 + 1, isPreview: false },
    ];
    expect(getCourseMissing(validCourse({ sections: [{ lessons }] }))).toEqual([
      { code: 'LESSON_VIDEO_INVALID', lessonId: 'a', lessonNumber: 1 },
      { code: 'LESSON_DURATION_INVALID', lessonId: 'b', lessonNumber: 2 },
      { code: 'LESSON_DURATION_INVALID', lessonNumber: 3 },
    ]);
  });

  it('requires 1 to 3 preview lessons', () => {
    const base = { videoUrl: VIDEO, durationSec: 60 };
    const none = [0, 1, 2].map(() => ({ ...base, isPreview: false }));
    const four = [0, 1, 2, 3].map(() => ({ ...base, isPreview: true }));
    expect(codes(validCourse({ sections: [{ lessons: none }] }))).toEqual(['PREVIEW_COUNT']);
    expect(codes(validCourse({ sections: [{ lessons: four }] }))).toEqual(['PREVIEW_COUNT']);
  });

  it('validates the price range and the original price', () => {
    expect(codes(validCourse({ priceCents: 50 }))).toEqual(['PRICE_INVALID']);
    expect(codes(validCourse({ priceCents: 100_000 }))).toEqual(['PRICE_INVALID']);
    expect(codes(validCourse({ priceCents: 99 }))).toEqual([]);
    expect(codes(validCourse({ priceCents: 99_999 }))).toEqual([]);
    expect(codes(validCourse({ priceCents: 4900, originalPriceCents: 4900 }))).toEqual([
      'ORIGINAL_PRICE_INVALID',
    ]);
    expect(codes(validCourse({ priceCents: 0, originalPriceCents: 0 }))).toEqual([
      'ORIGINAL_PRICE_INVALID',
    ]);
  });
});
