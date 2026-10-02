import {
  ANONYMOUS_VIEWER,
  buildCurriculum,
  clampPosition,
  computeLessonStatus,
  computeProgressPercent,
} from './lesson.logic';

describe('computeLessonStatus (BR-02)', () => {
  const base = { isCompleted: false, isLastLesson: false, isEnrolled: false, isPreview: false };

  it.each([
    [
      'COMPLETED beats everything',
      { ...base, isCompleted: true, isLastLesson: true, isEnrolled: true },
      'COMPLETED',
    ],
    [
      'IN_PROGRESS for the last lesson of an enrolled user',
      { ...base, isLastLesson: true, isEnrolled: true },
      'IN_PROGRESS',
    ],
    ['UNLOCKED for an enrolled user', { ...base, isEnrolled: true }, 'UNLOCKED'],
    ['UNLOCKED for a preview lesson', { ...base, isPreview: true }, 'UNLOCKED'],
    ['LOCKED otherwise', base, 'LOCKED'],
    [
      'LOCKED even if lastLessonId matches when not enrolled',
      { ...base, isLastLesson: true },
      'LOCKED',
    ],
  ] as const)('%s', (_label, input, expected) => {
    expect(computeLessonStatus(input)).toBe(expected);
  });
});

describe('buildCurriculum', () => {
  const sections = [
    {
      id: 's1',
      title: 'Introduction',
      order: 1,
      lessons: [
        { id: 'l1', title: 'Welcome', durationSec: 60, isPreview: true },
        { id: 'l2', title: 'Tools', durationSec: 120, isPreview: false },
      ],
    },
    { id: 's2', title: 'Empty section', order: 2, lessons: [] },
    {
      id: 's3',
      title: 'Practice',
      order: 3,
      lessons: [{ id: 'l3', title: 'First project', durationSec: 300, isPreview: false }],
    },
  ];

  it('numbers lessons continuously across sections, skipping empty ones', () => {
    const result = buildCurriculum(sections, ANONYMOUS_VIEWER);
    expect(result.map((s) => s.lessons.map((l) => l.number))).toEqual([[1, 2], [], [3]]);
    expect(result.map((s) => s.order)).toEqual([1, 2, 3]);
  });

  it('gives guests UNLOCKED for previews and LOCKED for the rest', () => {
    const result = buildCurriculum(sections, ANONYMOUS_VIEWER);
    expect(result.flatMap((s) => s.lessons.map((l) => l.status))).toEqual([
      'UNLOCKED',
      'LOCKED',
      'LOCKED',
    ]);
  });

  it('applies completed ids and lastLessonId for an enrolled viewer', () => {
    const result = buildCurriculum(sections, {
      isEnrolled: true,
      lastLessonId: 'l2',
      completedLessonIds: new Set(['l1']),
    });
    expect(result.flatMap((s) => s.lessons.map((l) => l.status))).toEqual([
      'COMPLETED',
      'IN_PROGRESS',
      'UNLOCKED',
    ]);
  });

  it('copies lesson fields into the DTO', () => {
    const [first] = buildCurriculum(sections, ANONYMOUS_VIEWER);
    expect(first?.lessons[0]).toEqual({
      id: 'l1',
      number: 1,
      title: 'Welcome',
      durationSec: 60,
      isPreview: true,
      status: 'UNLOCKED',
    });
  });

  it('returns an empty array for a course without sections', () => {
    expect(buildCurriculum([], ANONYMOUS_VIEWER)).toEqual([]);
  });
});

describe('computeProgressPercent (BR-04)', () => {
  it.each([
    [0, 0, 0],
    [0, 10, 0],
    [1, 3, 33],
    [2, 3, 67],
    [1, 8, 13], // 12.5 làm tròn lên
    [9, 10, 90],
    [10, 10, 100],
    [12, 10, 100], // kẹp tối đa 100
    [-1, 10, 0], // kẹp tối thiểu 0
  ])('%i of %i lessons = %i %%', (done, total, expected) => {
    expect(computeProgressPercent(done, total)).toBe(expected);
  });
});

describe('clampPosition (BR-03)', () => {
  it.each([
    [7, 15, 7],
    [7.6, 15, 8],
    [7.4, 15, 7],
    [-5, 15, 0],
    [999, 15, 15],
    [15, 15, 15],
    [10, 0, 0],
    [Number.NaN, 15, 0],
  ])('position %p in a %p s lesson -> %p', (position, duration, expected) => {
    expect(clampPosition(position, duration)).toBe(expected);
  });
});
