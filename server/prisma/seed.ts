/**
 * Seed dữ liệu mẫu (PLAN §11) - IDEMPOTENT: xóa toàn bộ dữ liệu theo thứ tự phụ thuộc rồi tạo lại,
 * chạy bao nhiêu lần cũng ra cùng một bộ dữ liệu (ID cố định, PRNG có seed).
 *
 *   npm run prisma:seed            # DB trong .env (dev)
 *   npx cross-env NODE_ENV=test tsx prisma/seed.ts   # DB test (.env.test)
 *
 * Nội dung nằm trong prisma/seed-data/*.ts. Tài khoản demo: xem prisma/seed-data/users.ts.
 */
import { env } from '@/config/env';
import { recomputeDenormalized } from '@/lib/denormalize';
import { hashPassword } from '@/lib/password';
import { disconnectPrisma, prisma } from '@/lib/prisma';

import { buildActivity } from './seed-data/activity';
import { buildCatalog, courseBannerUrl, courseThumbnailUrl } from './seed-data/catalog';
import { CATEGORIES } from './seed-data/categories';
import { Random } from './seed-data/random';
import { TAGS } from './seed-data/tags';
import { TEACHERS } from './seed-data/teachers';
import { DEMO_ACCOUNT, SEED_PASSWORD, STUDENTS } from './seed-data/users';

const SEED_RANDOM = 20260930;

/** Xóa toàn bộ dữ liệu, con trước - cha sau. */
async function clearAll(): Promise<void> {
  // AiContent tham chiếu courseId/lessonId/userId bằng id thường (không FK) nên phải xóa tay.
  await prisma.aiContent.deleteMany();
  await prisma.aiChatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.projectSubmission.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.questionLike.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.courseLike.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.section.deleteMany();
  await prisma.courseTag.deleteMany();
  await prisma.course.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
}

async function seedPeople(passwordHash: string, verifiedAt: Date): Promise<void> {
  await prisma.user.createMany({
    data: [
      ...TEACHERS.map((t) => ({
        id: t.userId,
        email: t.email,
        passwordHash,
        emailVerifiedAt: verifiedAt,
        fullName: t.fullName,
        headline: t.jobTitle,
        avatarUrl: t.avatarUrl,
        coverUrl: t.coverUrl,
        role: 'TEACHER' as const,
      })),
      ...STUDENTS.map((s) => ({
        id: s.id,
        email: s.email,
        passwordHash,
        emailVerifiedAt: verifiedAt,
        fullName: s.fullName,
        headline: s.headline,
        avatarUrl: s.avatarUrl,
        coverUrl: s.coverUrl,
        role: 'STUDENT' as const,
      })),
    ],
  });
  await prisma.teacherProfile.createMany({
    data: TEACHERS.map((t) => ({
      id: t.profileId,
      userId: t.userId,
      jobTitle: t.jobTitle,
      bio: t.bio,
      organization: t.organization,
      location: t.location,
      timezone: t.timezone,
    })),
  });
}

async function seedCatalog(now: number): Promise<ReturnType<typeof buildCatalog>> {
  await prisma.category.createMany({ data: CATEGORIES.map((c) => ({ ...c })) });
  await prisma.tag.createMany({ data: TAGS.map((t) => ({ ...t })) });

  const catalog = buildCatalog(now);
  const random = new Random(SEED_RANDOM + 1);
  await prisma.course.createMany({
    data: catalog.courses.map(({ seed, id, categoryId, teacherProfileId, createdAt }) => ({
      id,
      title: seed.title,
      subtitle: seed.subtitle,
      description: seed.description,
      thumbnailUrl: courseThumbnailUrl(seed),
      bannerUrl: courseBannerUrl(seed),
      priceCents: seed.priceCents,
      originalPriceCents: seed.originalPriceCents ?? null,
      benefits: seed.benefits,
      projectDescription: seed.projectDescription,
      isBestSeller: seed.isBestSeller ?? false,
      isFeatured: seed.isFeatured ?? false,
      isPublished: true,
      shareCount: random.int(0, seed.popularity === 'high' ? 60 : 15),
      categoryId,
      teacherId: teacherProfileId,
      createdAt,
    })),
  });
  await prisma.courseTag.createMany({ data: catalog.courseTags });
  await prisma.section.createMany({ data: catalog.sections });
  await prisma.lesson.createMany({
    data: catalog.lessons.map(
      ({ id, sectionId, title, order, durationSec, videoUrl, isPreview, content }) => ({
        id,
        sectionId,
        title,
        order,
        durationSec,
        videoUrl,
        isPreview,
        content,
      }),
    ),
  });
  await prisma.resource.createMany({ data: catalog.resources });
  return catalog;
}

async function seedActivity(catalog: ReturnType<typeof buildCatalog>, now: number): Promise<void> {
  const a = buildActivity(catalog, now, new Random(SEED_RANDOM));
  await prisma.enrollment.createMany({ data: a.enrollments });
  await prisma.lessonProgress.createMany({ data: a.lessonProgress });
  await prisma.order.createMany({ data: a.orders });
  await prisma.orderItem.createMany({ data: a.orderItems });
  await prisma.review.createMany({ data: a.reviews });
  await prisma.question.createMany({ data: a.questions });
  await prisma.answer.createMany({ data: a.answers });
  await prisma.questionLike.createMany({ data: a.questionLikes });
  await prisma.bookmark.createMany({ data: a.bookmarks });
  await prisma.courseLike.createMany({ data: a.courseLikes });
  await prisma.follow.createMany({ data: a.follows });
  await prisma.projectSubmission.createMany({ data: a.submissions });
  await prisma.notification.createMany({ data: a.notifications });
  await prisma.banner.createMany({ data: a.banners });
}

async function printSummary(): Promise<void> {
  const counts = {
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    teachers: await prisma.teacherProfile.count(),
    students: await prisma.user.count({ where: { role: 'STUDENT' } }),
    courses: await prisma.course.count(),
    freeCourses: await prisma.course.count({ where: { priceCents: 0 } }),
    sections: await prisma.section.count(),
    lessons: await prisma.lesson.count(),
    enrollments: await prisma.enrollment.count(),
    lessonProgress: await prisma.lessonProgress.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
    questions: await prisma.question.count(),
    answers: await prisma.answer.count(),
    resources: await prisma.resource.count(),
    submissions: await prisma.projectSubmission.count(),
    banners: await prisma.banner.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('Seed hoàn tất:', JSON.stringify(counts));
  console.log(`Tài khoản demo: ${DEMO_ACCOUNT.email} (mật khẩu: xem prisma/seed-data/users.ts)`);
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
    throw new Error(
      'Từ chối seed khi NODE_ENV=production (seed xóa toàn bộ dữ liệu). Đặt SEED_FORCE=1 nếu chắc chắn.',
    );
  }
  const host = new URL(env.DATABASE_URL.replace(/^postgres(ql)?:/, 'http:'));
  console.log(`Seeding ${host.hostname}:${host.port || '5432'}${host.pathname} ...`);

  const now = Date.now();
  const passwordHash = await hashPassword(SEED_PASSWORD);

  await clearAll();
  // Tài khoản mẫu đã xác minh email (AUTH-02) để đăng nhập demo ngay; 2FA tắt.
  await seedPeople(passwordHash, new Date(now));
  const catalog = await seedCatalog(now);
  await seedActivity(catalog, now);
  await recomputeDenormalized();
  await printSummary();
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
