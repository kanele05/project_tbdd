import { recomputeDenormalized } from '@/lib/denormalize';
import { prisma } from '@/lib/prisma';

import {
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';

beforeEach(async () => {
  await resetDb();
});

describe('recomputeDenormalized', () => {
  it('rebuilds course counters from the source rows', async () => {
    const { course } = await createCourseWithLessons({
      sections: 2,
      lessonsPerSection: 2,
      lessonDurationSec: 30,
      course: { ratingAvg: 1, ratingCount: 99, enrollmentCount: 99, lessonCount: 99 },
    });
    const empty = await createCourse({ ratingAvg: 3, ratingCount: 7, lessonCount: 5 });
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    await Promise.all([a, b, c].map((u) => createEnrollment(u.id, course.id)));
    await prisma.review.createMany({
      data: [
        { userId: a.id, courseId: course.id, rating: 5, content: 'Great course, loved it!' },
        { userId: b.id, courseId: course.id, rating: 4, content: 'Good course overall.' },
        { userId: c.id, courseId: course.id, rating: 4, content: 'Solid content and pace.' },
      ],
    });
    await prisma.courseLike.create({ data: { userId: a.id, courseId: course.id } });

    await recomputeDenormalized();

    const updated = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(updated).toMatchObject({
      lessonCount: 4,
      totalDurationSec: 120,
      ratingCount: 3,
      ratingAvg: 4.3,
      enrollmentCount: 3,
      likeCount: 1,
    });
    const untouched = await prisma.course.findUniqueOrThrow({ where: { id: empty.id } });
    expect(untouched).toMatchObject({
      lessonCount: 0,
      totalDurationSec: 0,
      ratingCount: 0,
      ratingAvg: 0,
      enrollmentCount: 0,
    });
  });

  it('rebuilds question likeCount and answerCount', async () => {
    const course = await createCourse();
    const [asker, helper] = await Promise.all([createUser(), createUser()]);
    const question = await prisma.question.create({
      data: {
        courseId: course.id,
        userId: asker.id,
        content: 'How does this work?',
        answerCount: 9,
      },
    });
    await prisma.answer.createMany({
      data: [
        { questionId: question.id, userId: helper.id, content: 'Like this.' },
        { questionId: question.id, userId: helper.id, content: 'And also this.' },
      ],
    });
    await prisma.questionLike.create({ data: { userId: helper.id, questionId: question.id } });

    await recomputeDenormalized();

    const updated = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(updated).toMatchObject({ answerCount: 2, likeCount: 1 });
  });
});
