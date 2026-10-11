import { createCategory, createCourse, createTag } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('GET /categories', () => {
  it('returns an empty list when there are no categories', async () => {
    const res = await api.get(`${API}/categories`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('returns categories sorted by order with the number of published courses', async () => {
    const design = await createCategory({
      name: 'Design',
      slug: 'design',
      order: 2,
      color: '#8353E2',
    });
    const business = await createCategory({ name: 'Business', slug: 'business', order: 1 });
    await createCourse({ categoryId: design.id });
    await createCourse({ categoryId: design.id });
    await createCourse({ categoryId: design.id, status: 'ARCHIVED' }); // không được đếm

    const res = await api.get(`${API}/categories`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      {
        id: business.id,
        name: 'Business',
        slug: 'business',
        icon: 'book',
        color: '#00BDD6',
        courseCount: 0,
      },
      {
        id: design.id,
        name: 'Design',
        slug: 'design',
        icon: 'book',
        color: '#8353E2',
        courseCount: 2,
      },
    ]);
  });

  it('is public (works without a token)', async () => {
    await createCategory();
    const res = await api.get(`${API}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /tags/hot', () => {
  it('returns only hot tags sorted by name', async () => {
    await createTag({ name: 'Python', isHot: true });
    await createTag({ name: 'Java', isHot: true });
    await createTag({ name: 'Gardening', isHot: false });

    const res = await api.get(`${API}/tags/hot`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: expect.any(String), name: 'Java', isHot: true },
      { id: expect.any(String), name: 'Python', isHot: true },
    ]);
  });

  it('returns an empty list when no tag is hot', async () => {
    await createTag({ name: 'Gardening', isHot: false });
    const res = await api.get(`${API}/tags/hot`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });
});
