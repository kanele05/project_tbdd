import { prisma } from '@/lib/prisma';
import {
  type CoursePreviewUpdate,
  updateCoursePreviews,
} from '@/modules/course/coursePreviewUpdate.service';

import { createCourseWithLessons, createEnrollment, createUser } from '../helpers/factories';

async function fixture() {
  const { course, lessons } = await createCourseWithLessons({ sections: 1, lessonsPerSection: 3 });
  const user = await createUser();
  const enrollment = await createEnrollment(user.id, course.id, { progressPercent: 35 });
  const preview: CoursePreviewUpdate = {
    courseId: course.id,
    lessonIds: [lessons[0]!.id, lessons[1]!.id],
    videoUrl: 'https://api.example.com/static/previews/fixture-v1.mp4',
    durationSec: 18,
  };
  return { course, lessons, user, enrollment, preview };
}

describe('course preview data update', () => {
  it('dry-runs without changing existing lessons or enrollment', async () => {
    const { course, lessons, enrollment, preview } = await fixture();
    const result = await updateCoursePreviews([preview]);
    expect(result.applied).toBe(false);
    expect(await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[0]!.id } })).toEqual(
      lessons[0],
    );
    expect(await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).toEqual(course);
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toEqual(
      enrollment,
    );
  });

  it('updates previews atomically and preserves users, progress and ordinary lessons', async () => {
    const { course, lessons, user, enrollment, preview } = await fixture();
    const progress = await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: lessons[2]!.id, positionSec: 7 },
    });
    await updateCoursePreviews([preview], true);
    const updatedCourse = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(updatedCourse.totalDurationSec).toBe(51);
    expect(updatedCourse.lessonCount).toBe(3);
    const updatedPreview = await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[0]!.id } });
    expect(updatedPreview).toMatchObject({ videoUrl: preview.videoUrl, durationSec: 18 });
    expect(await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[2]!.id } })).toEqual(
      lessons[2],
    );
    expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
      email: user.email,
      role: user.role,
    });
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toEqual(
      enrollment,
    );
    expect(
      await prisma.lessonProgress.findUniqueOrThrow({
        where: { userId_lessonId: { userId: user.id, lessonId: lessons[2]!.id } },
      }),
    ).toEqual(progress);
    expect((await updateCoursePreviews([preview], true)).changes[0]?.changedLessons).toBe(0);
  });

  it('rolls back all earlier updates if another course has mismatched lessons', async () => {
    const { course, lessons, preview } = await fixture();
    await expect(
      updateCoursePreviews(
        [
          preview,
          { ...preview, courseId: 'missing-course', lessonIds: ['missing-1', 'missing-2'] },
        ],
        true,
      ),
    ).rejects.toThrow('matching preview lessons');
    expect(await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[0]!.id } })).toEqual(
      lessons[0],
    );
    expect(await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).toEqual(course);
  });
});
