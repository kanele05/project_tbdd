import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createBookmark,
  createCategory,
  createCourse,
  createEnrollment,
  createFollow,
  createReview,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('GET /teachers', () => {
  it('ranks teachers by average course rating and paginates (BR-11)', async () => {
    const [low, high, mid, none] = await Promise.all([
      createTeacher({ fullName: 'Low' }),
      createTeacher({ fullName: 'High' }),
      createTeacher({ fullName: 'Mid' }),
      createTeacher({ fullName: 'No courses' }),
    ]);
    await createCourse({ teacherId: low.profile.id, ratingAvg: 3, ratingCount: 2 });
    await createCourse({ teacherId: high.profile.id, ratingAvg: 5, ratingCount: 1 });
    await createCourse({ teacherId: high.profile.id, ratingAvg: 4, ratingCount: 3 });
    await createCourse({ teacherId: mid.profile.id, ratingAvg: 4, ratingCount: 5 });
    await createCourse({
      teacherId: mid.profile.id,
      status: 'ARCHIVED',
      ratingAvg: 1,
      ratingCount: 9,
    });

    const res = await api.get(`${API}/teachers`).query({ sort: 'top', limit: 2 });
    const page2 = await api.get(`${API}/teachers`).query({ limit: 2, page: 2 });

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data).toEqual([
      expect.objectContaining({ fullName: 'High', ratingAvg: 4.5, ratingCount: 4 }),
      expect.objectContaining({ fullName: 'Mid', ratingAvg: 4, ratingCount: 5 }),
    ]);
    expect(page2.body.data.map((t: { fullName: string }) => t.fullName)).toEqual(['Low']);
    expect(none.profile.id).toBeDefined();
  });

  it('rejects an unsupported sort', async () => {
    const res = await api.get(`${API}/teachers`).query({ sort: 'name' });
    expect(res.status).toBe(400);
  });
});

describe('GET /teachers/:id', () => {
  it('returns the detail with stats, localTime and isFollowed', async () => {
    const teacher = await createTeacher({ fullName: 'Sara Teacher' });
    const [s1, s2, viewer] = await Promise.all([createUser(), createUser(), createUser()]);
    const a = await createCourse({ teacherId: teacher.profile.id, ratingAvg: 4, ratingCount: 2 });
    const b = await createCourse({ teacherId: teacher.profile.id });
    await createCourse({ teacherId: teacher.profile.id, status: 'ARCHIVED' });
    await createEnrollment(s1.id, a.id);
    await createEnrollment(s1.id, b.id); // cùng 1 học viên -> chỉ tính 1
    await createEnrollment(s2.id, a.id);
    await createFollow(s1.id, teacher.profile.id);
    await createFollow(viewer.id, teacher.profile.id);

    const guest = await api.get(`${API}/teachers/${teacher.profile.id}`);
    const asViewer = await api.get(`${API}/teachers/${teacher.profile.id}`).set(authHeader(viewer));

    expect(guest.status).toBe(200);
    expect(guest.body.data).toMatchObject({
      id: teacher.profile.id,
      fullName: 'Sara Teacher',
      jobTitle: 'Senior Designer',
      bio: 'Teacher bio for tests.',
      location: 'New York',
      timezone: 'America/New_York',
      ratingAvg: 4,
      ratingCount: 2,
      isFollowed: false,
      stats: { courseCount: 2, studentCount: 2, followerCount: 2 },
    });
    expect(guest.body.data.localTime).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
    expect(asViewer.body.data.isFollowed).toBe(true);
  });

  it('returns 404 TEACHER_NOT_FOUND for an unknown id', async () => {
    const res = await api.get(`${API}/teachers/nope`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TEACHER_NOT_FOUND');
  });
});

describe('GET /teachers/:id/courses', () => {
  it('groups published courses by category and flags top-rated groups (avg >= 4.5)', async () => {
    const teacher = await createTeacher();
    const [first, second] = await Promise.all([
      createCategory({ name: 'Design', order: 1 }),
      createCategory({ name: 'Code', order: 2 }),
    ]);
    const viewer = await createUser();
    const top = await createCourse({
      teacherId: teacher.profile.id,
      categoryId: first.id,
      title: 'Top A',
      ratingAvg: 4.8,
      ratingCount: 3,
    });
    await createCourse({
      teacherId: teacher.profile.id,
      categoryId: first.id,
      title: 'Top B',
      ratingAvg: 4.4,
      ratingCount: 3,
    });
    await createCourse({
      teacherId: teacher.profile.id,
      categoryId: second.id,
      title: 'Plain',
      ratingAvg: 3.9,
      ratingCount: 3,
    });
    await createCourse({
      teacherId: teacher.profile.id,
      categoryId: second.id,
      status: 'ARCHIVED',
    });
    await createBookmark(viewer.id, top.id);

    const res = await api
      .get(`${API}/teachers/${teacher.profile.id}/courses`)
      .set(authHeader(viewer));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      category: { id: first.id, name: 'Design' },
      isTopRated: true, // (4.8 + 4.4) / 2 = 4.6
    });
    expect(res.body.data[0].courses.map((c: { title: string }) => c.title)).toHaveLength(2);
    expect(res.body.data[0].courses.find((c: { id: string }) => c.id === top.id).isBookmarked).toBe(
      true,
    );
    expect(res.body.data[1]).toMatchObject({ category: { name: 'Code' }, isTopRated: false });
    expect(res.body.data[1].courses).toHaveLength(1);
  });

  it('returns an empty array for a teacher without courses and 404 for unknown ids', async () => {
    const teacher = await createTeacher();
    const empty = await api.get(`${API}/teachers/${teacher.profile.id}/courses`);
    const missing = await api.get(`${API}/teachers/nope/courses`);

    expect(empty.body.data).toEqual([]);
    expect(missing.status).toBe(404);
  });
});

describe('GET /teachers/:id/reviews', () => {
  it('lists reviews of the teacher courses, newest first, with the course reference', async () => {
    const teacher = await createTeacher();
    const course = await createCourse({ teacherId: teacher.profile.id, title: 'Reviewed' });
    const hidden = await createCourse({ teacherId: teacher.profile.id, status: 'ARCHIVED' });
    const elsewhere = await createCourse();
    const [u1, u2, u3] = await Promise.all([createUser(), createUser(), createUser()]);
    await createReview(u1.id, course.id, {
      rating: 5,
      content: 'The older review for this course.',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    await createReview(u2.id, course.id, {
      rating: 4,
      content: 'The newer review for this course.',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await createReview(u3.id, hidden.id, {
      rating: 1,
      content: 'Review of an unpublished course.',
    });
    await createReview(u3.id, elsewhere.id, { rating: 1, content: 'Review of another teacher.' });

    const res = await api.get(`${API}/teachers/${teacher.profile.id}/reviews`).query({ limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data).toEqual([
      expect.objectContaining({
        rating: 4,
        content: 'The newer review for this course.',
        course: { id: course.id, title: 'Reviewed' },
        user: expect.objectContaining({ id: u2.id }),
      }),
    ]);
  });

  it('returns 404 TEACHER_NOT_FOUND for an unknown id', async () => {
    const res = await api.get(`${API}/teachers/nope/reviews`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TEACHER_NOT_FOUND');
  });
});

describe('PUT/DELETE /teachers/:id/follow (BR-14)', () => {
  it('follows idempotently and returns the follower count', async () => {
    const teacher = await createTeacher();
    const user = await createUser();
    const other = await createUser();
    await createFollow(other.id, teacher.profile.id);

    const first = await api
      .put(`${API}/teachers/${teacher.profile.id}/follow`)
      .set(authHeader(user));
    const second = await api
      .put(`${API}/teachers/${teacher.profile.id}/follow`)
      .set(authHeader(user));

    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ followerCount: 2, isFollowed: true });
    expect(second.body.data).toEqual({ followerCount: 2, isFollowed: true });
    expect(await prisma.follow.count({ where: { teacherId: teacher.profile.id } })).toBe(2);
  });

  it('unfollows idempotently', async () => {
    const teacher = await createTeacher();
    const user = await createUser();
    await createFollow(user.id, teacher.profile.id);

    const first = await api
      .delete(`${API}/teachers/${teacher.profile.id}/follow`)
      .set(authHeader(user));
    const second = await api
      .delete(`${API}/teachers/${teacher.profile.id}/follow`)
      .set(authHeader(user));

    expect(first.body.data).toEqual({ followerCount: 0, isFollowed: false });
    expect(second.body.data).toEqual({ followerCount: 0, isFollowed: false });
  });

  it('returns 422 CANNOT_FOLLOW_SELF when a teacher follows themselves', async () => {
    const teacher = await createTeacher();
    const res = await api
      .put(`${API}/teachers/${teacher.profile.id}/follow`)
      .set(authHeader(teacher.user));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANNOT_FOLLOW_SELF');
  });

  it('returns 404 for an unknown teacher and 401 without a token', async () => {
    const user = await createUser();
    const missing = await api.put(`${API}/teachers/nope/follow`).set(authHeader(user));
    const anonymous = await api.put(`${API}/teachers/nope/follow`);

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('TEACHER_NOT_FOUND');
    expect(anonymous.status).toBe(401);
  });
});
