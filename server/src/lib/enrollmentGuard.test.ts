import { assertCoursePublished, assertEnrolled, assertEnrolledInCourse } from './enrollmentGuard';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

function fakeDb(overrides: { enrollment?: unknown; course?: unknown }) {
  return {
    enrollment: { findUnique: jest.fn().mockResolvedValue(overrides.enrollment ?? null) },
    course: {
      findUnique: jest.fn().mockResolvedValue(overrides.course ?? null),
      findFirst: jest.fn().mockResolvedValue(overrides.course ?? null),
    },
  } as never;
}

const enrollment = { id: 'enr-1', progressPercent: 10, lastLessonId: null };

describe('assertEnrolled', () => {
  it('returns the enrollment when the user is enrolled', async () => {
    await expect(assertEnrolled('u', 'c', fakeDb({ enrollment }))).resolves.toEqual(enrollment);
  });

  it('throws 403 NOT_ENROLLED otherwise', async () => {
    await expect(assertEnrolled('u', 'c', fakeDb({}))).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
  });
});

describe('assertEnrolledInCourse', () => {
  it('returns the enrollment found through the course', async () => {
    const db = fakeDb({ course: { id: 'c', enrollments: [enrollment] } });
    await expect(assertEnrolledInCourse('u', 'c', db)).resolves.toEqual(enrollment);
  });

  it('throws 404 COURSE_NOT_FOUND when the course does not exist', async () => {
    await expect(assertEnrolledInCourse('u', 'c', fakeDb({}))).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });

  it('throws 403 NOT_ENROLLED when the course exists but the user has no enrollment', async () => {
    const db = fakeDb({ course: { id: 'c', enrollments: [] } });
    await expect(assertEnrolledInCourse('u', 'c', db)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
  });
});

describe('assertCoursePublished', () => {
  it('passes for a published course and throws 404 otherwise', async () => {
    await expect(
      assertCoursePublished('c', fakeDb({ course: { id: 'c' } })),
    ).resolves.toBeUndefined();
    await expect(assertCoursePublished('c', fakeDb({}))).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});
