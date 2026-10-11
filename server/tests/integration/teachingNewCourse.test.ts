import { notifyFollowersOfNewCourse } from '@/lib/courseNotify';
import { prisma } from '@/lib/prisma';

import { createCourse, createFollow, createTeacher, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';

beforeEach(async () => {
  await resetDb();
});

describe('notifyFollowersOfNewCourse (FR-54, BR-27)', () => {
  it('creates a NEW_COURSE notification with courseId for each follower only', async () => {
    const { user, profile } = await createTeacher({ fullName: 'Followed Teacher' });
    const course = await createCourse({ title: 'Brand New', teacherId: profile.id });
    const f1 = await createUser();
    const f2 = await createUser();
    const bystander = await createUser();
    await createFollow(f1.id, profile.id);
    await createFollow(f2.id, profile.id);

    const count = await notifyFollowersOfNewCourse(course.id);

    expect(count).toBe(2);
    const rows = await prisma.notification.findMany({ orderBy: { userId: 'asc' } });
    expect(rows.map((r) => r.userId).sort()).toEqual([f1.id, f2.id].sort());
    expect(rows.every((r) => r.type === 'NEW_COURSE')).toBe(true);
    expect(rows[0]?.data).toEqual({
      courseId: course.id,
      key: 'NEW_COURSE',
      params: { teacher: 'Followed Teacher', courseTitle: 'Brand New' },
    });
    expect(rows[0]?.body).toContain('Brand New');
    expect(await prisma.notification.count({ where: { userId: bystander.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
  });

  it('returns 0 when nobody follows and throws 404 for an unknown course', async () => {
    const { profile } = await createTeacher();
    const course = await createCourse({ teacherId: profile.id });
    expect(await notifyFollowersOfNewCourse(course.id)).toBe(0);
    await expect(notifyFollowersOfNewCourse('nope')).rejects.toMatchObject({ status: 404 });
  });
});
