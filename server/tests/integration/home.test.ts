import { authHeader } from '../helpers/authHelper';
import {
  createBanner,
  createBookmark,
  createCategory,
  createCourse,
  createEnrollment,
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

type Item = { id: string; title: string; isBookmarked: boolean };
const titles = (items: Item[]): string[] => items.map((c) => c.title);

describe('GET /home', () => {
  it('returns the six sections (empty) for an empty database', async () => {
    const res = await api.get(`${API}/home`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      banners: [],
      categories: [],
      popular: [],
      recommended: [],
      inspires: [],
      topTeachers: [],
    });
  });

  it('gathers banners, categories, popular, inspires and top teachers for a guest (BR-11)', async () => {
    const cat = await createCategory({ name: 'Design', slug: 'design' });
    const strong = await createTeacher({ fullName: 'Strong Teacher' });
    const weak = await createTeacher({ fullName: 'Weak Teacher' });
    const noCourses = await createTeacher({ fullName: 'Lonely Teacher' });
    await createCourse({
      title: 'Hot',
      categoryId: cat.id,
      teacherId: strong.profile.id,
      enrollmentCount: 100,
      ratingAvg: 4.9,
      ratingCount: 10,
    });
    await createCourse({
      title: 'Warm',
      categoryId: cat.id,
      teacherId: weak.profile.id,
      enrollmentCount: 10,
      ratingAvg: 3.1,
      ratingCount: 4,
      isFeatured: true,
    });
    await createCourse({
      title: 'Hidden',
      categoryId: cat.id,
      status: 'ARCHIVED',
      enrollmentCount: 999,
    });
    await createBanner({ title: 'Second', order: 2 });
    await createBanner({ title: 'First', order: 1 });
    await createBanner({ title: 'Inactive', isActive: false });

    const res = await api.get(`${API}/home`);

    const data = res.body.data;
    expect(titles(data.popular)).toEqual(['Hot', 'Warm']);
    expect(titles(data.inspires)).toEqual(['Warm']);
    expect(titles(data.recommended)).toEqual(['Hot', 'Warm']);
    expect(data.banners.map((b: { title: string }) => b.title)).toEqual(['First', 'Second']);
    expect(data.banners[0]).toMatchObject({
      ctaText: 'JOIN NOW',
      bgColor: '#8353E2',
      target: { type: 'CATEGORY', id: 'cat_x' },
      imageUrl: expect.stringMatching(/^https?:\/\/.+\/static\/banners\/test\.png$/),
    });
    expect(data.categories).toEqual([expect.objectContaining({ name: 'Design', courseCount: 2 })]);
    expect(data.topTeachers.map((t: { fullName: string }) => t.fullName)).toEqual([
      'Strong Teacher',
      'Weak Teacher',
    ]);
    expect(data.topTeachers.some((t: { id: string }) => t.id === noCourses.profile.id)).toBe(false);
    expect(data.popular.every((c: Item) => c.isBookmarked === false)).toBe(true);
  });

  it('limits each section to 10 items', async () => {
    for (let i = 1; i <= 12; i += 1) await createCourse({ title: `C${i}`, enrollmentCount: i });

    const res = await api.get(`${API}/home`);

    expect(res.body.data.popular).toHaveLength(10);
    expect(res.body.data.recommended).toHaveLength(10);
  });

  it('personalizes recommended (BR-12) and isBookmarked for a logged-in user', async () => {
    const [interest, other, third] = await Promise.all([
      createCategory(),
      createCategory(),
      createCategory(),
    ]);
    const user = await createUser();
    const enrolled = await createCourse({ title: 'Enrolled', categoryId: interest.id });
    const saved = await createCourse({
      title: 'Saved other',
      categoryId: other.id,
      enrollmentCount: 5,
      ratingAvg: 2,
    });
    await createCourse({ title: 'Same category', categoryId: interest.id, ratingAvg: 3 });
    await createCourse({ title: 'Best elsewhere', categoryId: third.id, ratingAvg: 5 });
    await createEnrollment(user.id, enrolled.id);
    await createBookmark(user.id, saved.id);

    const res = await api.get(`${API}/home`).set(authHeader(user));
    const guest = await api.get(`${API}/home`);

    const data = res.body.data;
    // Danh mục quan tâm (đã ghi danh + đã lưu) đứng trước, khóa đã ghi danh bị loại.
    expect(titles(data.recommended)).toEqual(['Same category', 'Saved other', 'Best elsewhere']);
    expect(data.popular.find((c: Item) => c.title === 'Saved other').isBookmarked).toBe(true);
    // Phần công khai (cache) không rò rỉ dữ liệu của user sang khách.
    expect(guest.body.data.popular.every((c: Item) => !c.isBookmarked)).toBe(true);
    expect(titles(guest.body.data.recommended)).toContain('Enrolled');
  });

  it('counts top-teacher rating as the average of rated courses', async () => {
    const t = await createTeacher({ fullName: 'Rated Teacher' });
    const reviewer = await createUser();
    const course = await createCourse({
      teacherId: t.profile.id,
      ratingAvg: 4.2,
      ratingCount: 1,
    });
    await createReview(reviewer.id, course.id, { rating: 4, content: 'Good course, thank you.' });

    const res = await api.get(`${API}/home`);

    expect(res.body.data.topTeachers[0]).toMatchObject({ ratingAvg: 4.2, ratingCount: 1 });
  });

  it('returns 401 for an invalid token', async () => {
    const res = await api.get(`${API}/home`).set({ Authorization: 'Bearer broken' });
    expect(res.status).toBe(401);
  });
});
