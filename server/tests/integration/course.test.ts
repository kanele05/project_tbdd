import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createBookmark,
  createCartItem,
  createCategory,
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createFollow,
  createTag,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

type Item = { id: string; title: string };
const titles = (body: { data: Item[] }): string[] => body.data.map((c) => c.title);

describe('GET /courses - search (BR-13)', () => {
  it('matches title, subtitle, tag name and teacher name, ignoring case', async () => {
    const maya = await createTeacher({ fullName: 'Maya Quartz' });
    const other = await createTeacher({ fullName: 'Someone Else' });
    const byTitle = await createCourse({ title: 'Quartz Basics', teacherId: other.profile.id });
    const byTeacher = await createCourse({ title: 'Plain A', teacherId: maya.profile.id });
    const byTag = await createCourse({ title: 'Plain B', teacherId: other.profile.id });
    const bySubtitle = await createCourse({ title: 'Plain C', teacherId: other.profile.id });
    await createCourse({ title: 'Unrelated', teacherId: other.profile.id });
    await prisma.course.update({
      where: { id: bySubtitle.id },
      data: { subtitle: 'All about QUARTZ' },
    });
    const tag = await createTag({ name: 'Quartz' });
    await prisma.courseTag.create({ data: { courseId: byTag.id, tagId: tag.id } });

    const res = await api.get(`${API}/courses`).query({ q: 'quartz', sort: 'newest' });

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(4);
    expect(new Set(titles(res.body))).toEqual(
      new Set([byTitle.title, byTeacher.title, byTag.title, bySubtitle.title]),
    );
  });

  it('requires every word to match somewhere and ignores unpublished courses', async () => {
    const t = await createTeacher({ fullName: 'Zed Zero' });
    await createCourse({ title: 'Design Systems', teacherId: t.profile.id });
    await createCourse({ title: 'Design Only', teacherId: t.profile.id });
    await createCourse({
      title: 'Design Systems Hidden',
      teacherId: t.profile.id,
      status: 'ARCHIVED',
    });

    const res = await api.get(`${API}/courses`).query({ q: '  design   SYSTEMS ' });

    expect(titles(res.body)).toEqual(['Design Systems']);
  });

  it('treats % and _ in the search text as plain characters', async () => {
    const t = await createTeacher();
    await createCourse({ title: '100% Practical', teacherId: t.profile.id });
    await createCourse({ title: 'Another one', teacherId: t.profile.id });

    const percent = await api.get(`${API}/courses`).query({ q: '%' });
    const underscore = await api.get(`${API}/courses`).query({ q: '_' });

    expect(titles(percent.body)).toEqual(['100% Practical']);
    expect(underscore.body.data).toEqual([]);
  });

  it('ignores an empty q', async () => {
    await createCourse();
    const res = await api.get(`${API}/courses`).query({ q: '' });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });
});

describe('GET /courses - filters, sorting and pagination', () => {
  it('filters by one or several category ids (CSV) and by teacher', async () => {
    const [a, b, c] = await Promise.all([createCategory(), createCategory(), createCategory()]);
    const t1 = await createTeacher();
    const t2 = await createTeacher();
    await createCourse({ title: 'In A', categoryId: a.id, teacherId: t1.profile.id });
    await createCourse({ title: 'In B', categoryId: b.id, teacherId: t2.profile.id });
    await createCourse({ title: 'In C', categoryId: c.id, teacherId: t1.profile.id });

    const csv = await api
      .get(`${API}/courses`)
      .query({ categoryId: `${a.id},${b.id}`, sort: 'newest' });
    const byTeacher = await api.get(`${API}/courses`).query({ teacherId: t1.profile.id });
    const combo = await api
      .get(`${API}/courses`)
      .query({ teacherId: t1.profile.id, categoryId: c.id });

    expect(new Set(titles(csv.body))).toEqual(new Set(['In A', 'In B']));
    expect(new Set(titles(byTeacher.body))).toEqual(new Set(['In A', 'In C']));
    expect(titles(combo.body)).toEqual(['In C']);
  });

  it('filters by free / paid, price range and minimum rating', async () => {
    await createCourse({ title: 'Free', priceCents: 0, ratingAvg: 3, ratingCount: 2 });
    await createCourse({ title: 'Cheap', priceCents: 1000, ratingAvg: 4.5, ratingCount: 2 });
    await createCourse({ title: 'Mid', priceCents: 5000, ratingAvg: 4.0, ratingCount: 2 });
    await createCourse({ title: 'Pricey', priceCents: 20000, ratingAvg: 4.8, ratingCount: 2 });

    const free = await api.get(`${API}/courses`).query({ isFree: 'true' });
    const paid = await api.get(`${API}/courses`).query({ isFree: 'false', sort: 'price_asc' });
    const range = await api
      .get(`${API}/courses`)
      .query({ minPrice: 1000, maxPrice: 5000, sort: 'price_desc' });
    const rated = await api.get(`${API}/courses`).query({ minRating: 4.5, sort: 'rating' });

    expect(titles(free.body)).toEqual(['Free']);
    expect(titles(paid.body)).toEqual(['Cheap', 'Mid', 'Pricey']);
    expect(titles(range.body)).toEqual(['Mid', 'Cheap']);
    expect(titles(rated.body)).toEqual(['Pricey', 'Cheap']);
  });

  it('sorts by popular (default), newest and rating', async () => {
    const old = await createCourse({ title: 'Old', enrollmentCount: 50, ratingAvg: 3 });
    await createCourse({ title: 'Hot', enrollmentCount: 90, ratingAvg: 4 });
    await createCourse({ title: 'Fresh', enrollmentCount: 1, ratingAvg: 5 });
    await prisma.course.update({
      where: { id: old.id },
      data: { createdAt: new Date('2020-01-01T00:00:00Z') },
    });

    const popular = await api.get(`${API}/courses`);
    const newest = await api.get(`${API}/courses`).query({ sort: 'newest' });
    const rating = await api.get(`${API}/courses`).query({ sort: 'rating' });

    expect(titles(popular.body)).toEqual(['Hot', 'Old', 'Fresh']);
    expect(titles(newest.body).at(-1)).toBe('Old');
    expect(titles(rating.body)).toEqual(['Fresh', 'Hot', 'Old']);
  });

  it('paginates with stable ordering and returns meta', async () => {
    for (let i = 1; i <= 5; i += 1)
      await createCourse({ title: `Course ${i}`, enrollmentCount: i });

    const page1 = await api.get(`${API}/courses`).query({ limit: 2, page: 1 });
    const page3 = await api.get(`${API}/courses`).query({ limit: 2, page: 3 });

    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(titles(page1.body)).toEqual(['Course 5', 'Course 4']);
    expect(titles(page3.body)).toEqual(['Course 1']);
  });

  it('lists only the featured courses for section=inspires', async () => {
    await createCourse({ title: 'Featured', isFeatured: true });
    await createCourse({ title: 'Normal' });

    const res = await api.get(`${API}/courses`).query({ section: 'inspires' });

    expect(titles(res.body)).toEqual(['Featured']);
  });

  it('ranks section=recommended by interest categories first and hides enrolled courses (BR-12)', async () => {
    const [interest, other] = await Promise.all([createCategory(), createCategory()]);
    const user = await createUser();
    const enrolled = await createCourse({ title: 'Enrolled', categoryId: interest.id });
    await createCourse({ title: 'Interest low', categoryId: interest.id, ratingAvg: 3 });
    await createCourse({ title: 'Other high', categoryId: other.id, ratingAvg: 5, ratingCount: 3 });
    await createEnrollment(user.id, enrolled.id);

    const res = await api
      .get(`${API}/courses`)
      .query({ section: 'recommended' })
      .set(authHeader(user));
    const guest = await api.get(`${API}/courses`).query({ section: 'recommended' });

    expect(titles(res.body)).toEqual(['Interest low', 'Other high']);
    expect(res.body.meta.total).toBe(2);
    expect(titles(guest.body)).toEqual(['Other high', 'Interest low', 'Enrolled']);
  });

  it('marks bookmarked courses for a logged-in user only', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createBookmark(user.id, course.id);

    const asUser = await api.get(`${API}/courses`).set(authHeader(user));
    const asGuest = await api.get(`${API}/courses`);

    expect(asUser.body.data[0].isBookmarked).toBe(true);
    expect(asGuest.body.data[0].isBookmarked).toBe(false);
  });

  it('rejects invalid query values with 400 VALIDATION_ERROR', async () => {
    const badSort = await api.get(`${API}/courses`).query({ sort: 'cheapest' });
    const badRange = await api.get(`${API}/courses`).query({ minPrice: 500, maxPrice: 100 });
    const badLimit = await api.get(`${API}/courses`).query({ limit: 100 });

    for (const res of [badSort, badRange, badLimit]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 401 when the token is invalid', async () => {
    const res = await api.get(`${API}/courses`).set({ Authorization: 'Bearer nope' });
    expect(res.status).toBe(401);
  });
});

describe('GET /courses/:id', () => {
  it('returns the detail for a guest with default user state', async () => {
    const { course, lessons } = await createCourseWithLessons({
      course: { title: 'Detail Course', priceCents: 4900, originalPriceCents: 9800 },
    });

    const res = await api.get(`${API}/courses/${course.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: course.id,
      title: 'Detail Course',
      subtitle: 'A course used in tests',
      benefits: ['Benefit one', 'Benefit two'],
      badge: 'DISCOUNT',
      discountPercent: 50,
      isBookmarked: false,
      isLiked: false,
      isInCart: false,
      enrollment: null,
      previewLessonId: lessons[0].id,
      category: { id: course.categoryId },
      teacher: { id: course.teacherId, jobTitle: 'Senior Designer', isFollowed: false },
    });
    expect(res.body.data.teacher.avatarUrl).toBeNull();
  });

  it('includes the logged-in user state (enrollment, cart, bookmark, like, follow)', async () => {
    const user = await createUser();
    const { course } = await createCourseWithLessons();
    const other = await createCourse();
    await createEnrollment(user.id, course.id, { progressPercent: 40 });
    await createBookmark(user.id, course.id);
    await createFollow(user.id, course.teacherId);
    await prisma.courseLike.create({ data: { userId: user.id, courseId: course.id } });
    await createCartItem(user.id, other.id);

    const enrolled = await api.get(`${API}/courses/${course.id}`).set(authHeader(user));
    const inCart = await api.get(`${API}/courses/${other.id}`).set(authHeader(user));

    expect(enrolled.body.data).toMatchObject({
      isBookmarked: true,
      isLiked: true,
      isInCart: false,
      enrollment: { progressPercent: 40, lastLessonId: null },
      teacher: { isFollowed: true },
    });
    expect(inCart.body.data).toMatchObject({ isInCart: true, enrollment: null });
  });

  it('returns previewLessonId null when no lesson is a preview', async () => {
    const { course } = await createCourseWithLessons({ previewCount: 0 });
    const res = await api.get(`${API}/courses/${course.id}`);
    expect(res.body.data.previewLessonId).toBeNull();
  });

  it('returns 404 COURSE_NOT_FOUND for a missing or unpublished course', async () => {
    const hidden = await createCourse({ status: 'ARCHIVED' });

    const missing = await api.get(`${API}/courses/does-not-exist`);
    const unpublished = await api.get(`${API}/courses/${hidden.id}`);

    for (const res of [missing, unpublished]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
    }
  });
});

describe('GET /courses/:id/similar', () => {
  it('returns at most 3 published courses of the same category, best rated first', async () => {
    const [cat, otherCat] = await Promise.all([createCategory(), createCategory()]);
    const base = await createCourse({ categoryId: cat.id, title: 'Base' });
    for (let i = 1; i <= 4; i += 1) {
      await createCourse({ categoryId: cat.id, title: `Same ${i}`, ratingAvg: i, ratingCount: 1 });
    }
    await createCourse({ categoryId: cat.id, title: 'Hidden', status: 'ARCHIVED', ratingAvg: 5 });
    await createCourse({ categoryId: otherCat.id, title: 'Elsewhere', ratingAvg: 5 });

    const res = await api.get(`${API}/courses/${base.id}/similar`);

    expect(res.status).toBe(200);
    expect(titles(res.body)).toEqual(['Same 4', 'Same 3', 'Same 2']);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const res = await api.get(`${API}/courses/nope/similar`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});
