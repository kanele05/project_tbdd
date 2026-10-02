/**
 * Factory tạo dữ liệu test nhanh. Mọi tham số đều tùy chọn (có giá trị mặc định duy nhất),
 * truyền `overrides` khi test cần giá trị cụ thể.
 *
 *   const user = await createUser();                        // user.password = mật khẩu thô để login
 *   const { course, lessons } = await createCourseWithLessons({ sections: 2, lessonsPerSection: 3 });
 *   await createEnrollment(user.id, course.id, { progressPercent: 30 });
 */
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

export const DEFAULT_TEST_PASSWORD = 'Passw0rdTest';

let counter = 0;
/** Chuỗi duy nhất trong một lần chạy test. */
export function uniq(prefix = 'x'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

let defaultHash: Promise<string> | undefined;

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export async function createUser(
  overrides: {
    email?: string;
    fullName?: string;
    password?: string;
    role?: Role;
    headline?: string | null;
    avatarUrl?: string | null;
  } = {},
) {
  const password = overrides.password ?? DEFAULT_TEST_PASSWORD;
  let passwordHash: string;
  if (overrides.password === undefined) {
    defaultHash ??= hashPassword(DEFAULT_TEST_PASSWORD); // dùng lại hash để test nhanh
    passwordHash = await defaultHash;
  } else {
    passwordHash = await hashPassword(password);
  }
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `${uniq('user')}@example.com`,
      fullName: overrides.fullName ?? 'Test User',
      headline: overrides.headline ?? null,
      avatarUrl: overrides.avatarUrl ?? null,
      role: overrides.role ?? 'STUDENT',
      passwordHash,
    },
  });
  return { ...user, password };
}

/** Giảng viên = User (role TEACHER) + TeacherProfile. `profile.id` là id dùng trong API (`teacher.id`). */
export async function createTeacher(
  overrides: { fullName?: string; jobTitle?: string; organization?: string | null } = {},
) {
  const user = await createUser({
    fullName: overrides.fullName ?? 'Test Teacher',
    role: 'TEACHER',
  });
  const profile = await prisma.teacherProfile.create({
    data: {
      userId: user.id,
      jobTitle: overrides.jobTitle ?? 'Senior Designer',
      organization: overrides.organization ?? 'Test University',
      bio: 'Teacher bio for tests.',
      location: 'New York',
      timezone: 'America/New_York',
    },
  });
  return { user, profile };
}

export function createCategory(
  overrides: { name?: string; slug?: string; icon?: string; color?: string; order?: number } = {},
) {
  const key = uniq('cat');
  return prisma.category.create({
    data: {
      name: overrides.name ?? `Category ${key}`,
      slug: overrides.slug ?? key,
      icon: overrides.icon ?? 'book',
      color: overrides.color ?? '#00BDD6',
      order: overrides.order ?? 0,
    },
  });
}

export function createTag(overrides: { name?: string; isHot?: boolean } = {}) {
  return prisma.tag.create({
    data: { name: overrides.name ?? uniq('tag'), isHot: overrides.isHot ?? false },
  });
}

export async function createCourse(
  overrides: {
    title?: string;
    teacherId?: string; // TeacherProfile.id
    categoryId?: string;
    priceCents?: number;
    originalPriceCents?: number | null;
    isBestSeller?: boolean;
    isFeatured?: boolean;
    isPublished?: boolean;
    ratingAvg?: number;
    ratingCount?: number;
    enrollmentCount?: number;
    lessonCount?: number;
    totalDurationSec?: number;
  } = {},
) {
  const teacherId = overrides.teacherId ?? (await createTeacher()).profile.id;
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  return prisma.course.create({
    data: {
      title: overrides.title ?? `Course ${uniq('c')}`,
      subtitle: 'A course used in tests',
      description: 'Course description for tests.',
      thumbnailUrl: 'https://picsum.photos/seed/test/600/400',
      priceCents: overrides.priceCents ?? 5900,
      originalPriceCents: overrides.originalPriceCents ?? null,
      benefits: ['Benefit one', 'Benefit two'],
      isBestSeller: overrides.isBestSeller ?? false,
      isFeatured: overrides.isFeatured ?? false,
      isPublished: overrides.isPublished ?? true,
      ratingAvg: overrides.ratingAvg ?? 0,
      ratingCount: overrides.ratingCount ?? 0,
      enrollmentCount: overrides.enrollmentCount ?? 0,
      lessonCount: overrides.lessonCount ?? 0,
      totalDurationSec: overrides.totalDurationSec ?? 0,
      categoryId,
      teacherId,
    },
  });
}

export function createSection(
  courseId: string,
  overrides: { title?: string; order?: number } = {},
) {
  return prisma.section.create({
    data: { courseId, title: overrides.title ?? 'Section', order: overrides.order ?? 1 },
  });
}

export function createLesson(
  sectionId: string,
  overrides: { title?: string; order?: number; durationSec?: number; isPreview?: boolean } = {},
) {
  return prisma.lesson.create({
    data: {
      sectionId,
      title: overrides.title ?? 'Lesson',
      order: overrides.order ?? 1,
      durationSec: overrides.durationSec ?? 15,
      videoUrl: 'http://localhost:4001/static/videos/sample.mp4',
      isPreview: overrides.isPreview ?? false,
    },
  });
}

/**
 * Khóa học đầy đủ chương/bài (2 bài đầu isPreview mặc định) và cập nhật `lessonCount`, `totalDurationSec`.
 */
export async function createCourseWithLessons(
  options: {
    sections?: number;
    lessonsPerSection?: number;
    previewCount?: number;
    lessonDurationSec?: number;
    course?: Parameters<typeof createCourse>[0];
  } = {},
) {
  const { sections = 2, lessonsPerSection = 3, previewCount = 2, lessonDurationSec = 15 } = options;
  const course = await createCourse(options.course);
  const createdSections = [];
  const lessons = [];
  let number = 0;
  for (let s = 1; s <= sections; s += 1) {
    const section = await createSection(course.id, { title: `Section ${s}`, order: s });
    createdSections.push(section);
    for (let l = 1; l <= lessonsPerSection; l += 1) {
      number += 1;
      lessons.push(
        await createLesson(section.id, {
          title: `Lesson ${number}`,
          order: l,
          durationSec: lessonDurationSec,
          isPreview: number <= previewCount,
        }),
      );
    }
  }
  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { lessonCount: lessons.length, totalDurationSec: lessons.length * lessonDurationSec },
  });
  return { course: updated, sections: createdSections, lessons };
}

export function createEnrollment(
  userId: string,
  courseId: string,
  overrides: { progressPercent?: number; lastLessonId?: string | null } = {},
) {
  return prisma.enrollment.create({
    data: {
      userId,
      courseId,
      progressPercent: overrides.progressPercent ?? 0,
      lastLessonId: overrides.lastLessonId ?? null,
      completedAt: overrides.progressPercent === 100 ? new Date() : null,
    },
  });
}

export function createBookmark(userId: string, courseId: string) {
  return prisma.bookmark.create({ data: { userId, courseId } });
}
