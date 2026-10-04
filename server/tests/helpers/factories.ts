/**
 * Factory tạo dữ liệu test nhanh. Mọi tham số đều tùy chọn (có giá trị mặc định duy nhất),
 * truyền `overrides` khi test cần giá trị cụ thể.
 *
 *   const user = await createUser();                        // user.password = mật khẩu thô để login
 *   const { course, lessons } = await createCourseWithLessons({ sections: 2, lessonsPerSection: 3 });
 *   await createEnrollment(user.id, course.id, { progressPercent: 30 });
 */
import { signAccessToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

import { registerTestToken } from './authHelper';

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
    /** Mặc định true: tài khoản đã xác minh email (đăng nhập được ngay). */
    verified?: boolean;
    /** Mặc định true: tạo sẵn một Session + access token để `authHeader(user)` dùng được. */
    session?: boolean;
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
      emailVerifiedAt: overrides.verified === false ? null : new Date(),
    },
  });
  const sessionId = overrides.session === false ? null : await createTestSession(user);
  return { ...user, password, sessionId };
}

/**
 * Tạo Session trong DB và ghi nhớ access token tương ứng cho `authHeader(user)`.
 * Trả id phiên (claim `sid`).
 */
export async function createTestSession(user: { id: string; role: Role }): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      deviceName: 'Test helper',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  registerTestToken(
    user.id,
    signAccessToken({ id: user.id, role: user.role, sessionId: session.id }),
  );
  return session.id;
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

export function createReview(
  userId: string,
  courseId: string,
  overrides: { rating?: number; content?: string; createdAt?: Date } = {},
) {
  return prisma.review.create({
    data: {
      userId,
      courseId,
      rating: overrides.rating ?? 5,
      content: overrides.content ?? 'A review used in tests, long enough.',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

export function createQuestion(
  userId: string,
  courseId: string,
  overrides: { content?: string; createdAt?: Date } = {},
) {
  return prisma.question.create({
    data: {
      userId,
      courseId,
      content: overrides.content ?? 'How do I get started with this course?',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

export function createAnswer(
  userId: string,
  questionId: string,
  overrides: { content?: string; createdAt?: Date } = {},
) {
  return prisma.answer.create({
    data: {
      userId,
      questionId,
      content: overrides.content ?? 'Start with the first lesson.',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

export function createLessonProgress(
  userId: string,
  lessonId: string,
  overrides: { positionSec?: number; isCompleted?: boolean } = {},
) {
  return prisma.lessonProgress.create({
    data: {
      userId,
      lessonId,
      positionSec: overrides.positionSec ?? 0,
      isCompleted: overrides.isCompleted ?? false,
    },
  });
}

// ---------------------------------------------------------------- Cart / Follow / Home / Notification / Project (agent A)

export function createCartItem(userId: string, courseId: string, addedAt?: Date) {
  return prisma.cartItem.create({ data: { userId, courseId, ...(addedAt ? { addedAt } : {}) } });
}

export function createFollow(userId: string, teacherId: string) {
  return prisma.follow.create({ data: { userId, teacherId } });
}

export function createBanner(
  overrides: {
    title?: string;
    order?: number;
    isActive?: boolean;
    targetType?: 'COURSE' | 'CATEGORY';
    targetId?: string;
  } = {},
) {
  return prisma.banner.create({
    data: {
      title: overrides.title ?? uniq('banner'),
      subtitle: '20% OFF',
      ctaText: 'JOIN NOW',
      imageUrl: '/static/banners/test.png',
      bgColor: '#8353E2',
      targetType: overrides.targetType ?? 'CATEGORY',
      targetId: overrides.targetId ?? 'cat_x',
      order: overrides.order ?? 0,
      isActive: overrides.isActive ?? true,
    },
  });
}

export function createNotification(
  userId: string,
  overrides: {
    type?: 'ORDER_PAID' | 'NEW_ANSWER' | 'COURSE_COMPLETED' | 'SYSTEM';
    title?: string;
    isRead?: boolean;
    createdAt?: Date;
    data?: { courseId?: string; questionId?: string };
  } = {},
) {
  return prisma.notification.create({
    data: {
      userId,
      type: overrides.type ?? 'SYSTEM',
      title: overrides.title ?? 'Notification',
      body: 'Notification body',
      isRead: overrides.isRead ?? false,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
      ...(overrides.data ? { data: overrides.data } : {}),
    },
  });
}

export function createResource(courseId: string, overrides: { name?: string } = {}) {
  return prisma.resource.create({
    data: {
      courseId,
      name: overrides.name ?? 'Document 1.txt',
      fileUrl: '/static/resources/Document%201.txt',
      sizeBytes: 329,
      mimeType: 'text/plain',
    },
  });
}

export function createSubmission(
  userId: string,
  courseId: string,
  overrides: { title?: string; createdAt?: Date } = {},
) {
  return prisma.projectSubmission.create({
    data: {
      userId,
      courseId,
      title: overrides.title ?? 'My project',
      fileUrl: '/uploads/test-file.txt',
      imageUrl: '/uploads/test-image.png',
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}
