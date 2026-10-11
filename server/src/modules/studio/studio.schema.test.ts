import {
  createCourseBody,
  createLessonBody,
  reorderBody,
  teacherProfileBody,
  updateCourseBody,
  updateLessonBody,
} from './studio.schema';
import { isOwnUploadUrl, thumbnailToDto, toStoredThumbnail } from './studioUrl';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

describe('toStoredThumbnail / isOwnUploadUrl', () => {
  it.each([
    ['/uploads/courses/abc-1.png', '/uploads/courses/abc-1.png'],
    ['  /uploads/courses/a.JPG ', '/uploads/courses/a.JPG'],
    ['http://localhost:4001/uploads/courses/x.jpeg', '/uploads/courses/x.jpeg'],
  ])('accepts %s', (input, stored) => {
    expect(toStoredThumbnail(input)).toBe(stored);
    expect(isOwnUploadUrl(input)).toBe(true);
  });

  it.each([
    '',
    'https://evil.test/uploads/courses/a.png',
    '/uploads/a.png',
    '/uploads/courses/../a.png',
    '/uploads/courses/a.gif',
    '/uploads/courses/sub/a.png',
    'http://localhost:4001/uploads/courses/a.png?x=1',
    'javascript:alert(1)',
  ])('rejects %j', (input) => {
    expect(toStoredThumbnail(input)).toBeNull();
  });

  it('keeps an empty stored thumbnail empty and makes the rest absolute', () => {
    expect(thumbnailToDto('')).toBe('');
    expect(thumbnailToDto('/uploads/courses/a.png')).toMatch(
      /^https?:\/\/.+\/uploads\/courses\/a\.png$/,
    );
    expect(thumbnailToDto('https://picsum.photos/x')).toBe('https://picsum.photos/x');
  });
});

describe('course body schemas', () => {
  it('requires title and categoryId at creation, everything else optional', () => {
    expect(createCourseBody.safeParse({ title: 'Hello world', categoryId: 'c' }).success).toBe(
      true,
    );
    expect(createCourseBody.safeParse({ title: 'Hello world' }).success).toBe(false);
    expect(createCourseBody.safeParse({ categoryId: 'c' }).success).toBe(false);
  });

  it('trims the title and enforces the length limits', () => {
    expect(createCourseBody.parse({ title: '  Hello world  ', categoryId: 'c' }).title).toBe(
      'Hello world',
    );
    expect(createCourseBody.safeParse({ title: '1234', categoryId: 'c' }).success).toBe(false);
    expect(createCourseBody.safeParse({ title: 'x'.repeat(121), categoryId: 'c' }).success).toBe(
      false,
    );
  });

  it('rejects duplicated tags, too many benefits and a huge price', () => {
    const base = { title: 'Hello world', categoryId: 'c' };
    expect(createCourseBody.safeParse({ ...base, tagIds: ['a', 'a'] }).success).toBe(false);
    expect(createCourseBody.safeParse({ ...base, benefits: Array(11).fill('b') }).success).toBe(
      false,
    );
    expect(createCourseBody.safeParse({ ...base, priceCents: 100_000 }).success).toBe(false);
    expect(createCourseBody.safeParse({ ...base, priceCents: 1.5 }).success).toBe(false);
  });

  it('needs at least one defined field on update', () => {
    expect(updateCourseBody.safeParse({}).success).toBe(false);
    expect(updateCourseBody.safeParse({ unknown: 1 }).success).toBe(false);
    expect(updateCourseBody.safeParse({ subtitle: null }).success).toBe(true);
  });
});

describe('lesson body schemas', () => {
  const lesson = { title: 'L', videoUrl: YT, durationSec: 60, isPreview: false };

  it('accepts a valid lesson and rejects bad links / durations', () => {
    expect(createLessonBody.safeParse(lesson).success).toBe(true);
    expect(createLessonBody.safeParse({ ...lesson, videoUrl: 'https://vimeo.com/1' }).success).toBe(
      false,
    );
    expect(createLessonBody.safeParse({ ...lesson, durationSec: 0 }).success).toBe(false);
    expect(createLessonBody.safeParse({ ...lesson, durationSec: 21_601 }).success).toBe(false);
    expect(createLessonBody.safeParse({ ...lesson, content: 'x'.repeat(3001) }).success).toBe(
      false,
    );
  });

  it('needs at least one field to patch a lesson', () => {
    expect(updateLessonBody.safeParse({}).success).toBe(false);
    expect(updateLessonBody.safeParse({ isPreview: true }).success).toBe(true);
  });
});

describe('reorderBody', () => {
  it('accepts both targets and rejects duplicates / unknown targets', () => {
    expect(reorderBody.safeParse({ target: 'sections', ids: ['a', 'b'] }).success).toBe(true);
    expect(reorderBody.safeParse({ target: 'lessons', sectionId: 's', ids: ['a'] }).success).toBe(
      true,
    );
    expect(reorderBody.safeParse({ target: 'lessons', ids: ['a'] }).success).toBe(false);
    expect(reorderBody.safeParse({ target: 'sections', ids: ['a', 'a'] }).success).toBe(false);
    expect(reorderBody.safeParse({ target: 'other', ids: [] }).success).toBe(false);
  });
});

describe('teacherProfileBody', () => {
  it('normalizes empty optional strings to null and validates the time zone', () => {
    expect(teacherProfileBody.parse({ organization: '', location: ' Hanoi ' })).toEqual({
      organization: null,
      location: 'Hanoi',
    });
    expect(teacherProfileBody.safeParse({ timezone: 'Asia/Ho_Chi_Minh' }).success).toBe(true);
    expect(teacherProfileBody.safeParse({ timezone: 'UTC' }).success).toBe(true);
    expect(teacherProfileBody.safeParse({ timezone: 'Not/AZone' }).success).toBe(false);
    expect(teacherProfileBody.parse({ timezone: null })).toEqual({ timezone: null });
  });

  it('needs at least one field', () => {
    expect(teacherProfileBody.safeParse({}).success).toBe(false);
  });
});
