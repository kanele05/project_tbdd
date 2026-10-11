/**
 * Chạy seed thật lên DB test (2 lần) rồi kiểm tra: idempotent, khớp PLAN §11, tài khoản demo khớp design,
 * trường denormalize đúng, và đăng nhập tài khoản demo qua API.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { prisma } from '@/lib/prisma';

import { DEMO_ACCOUNT, SEED_PASSWORD } from '../../prisma/seed-data/users';
import { API, createTestApi } from '../helpers/testApp';

const SERVER_ROOT = path.resolve(__dirname, '..', '..');

function runSeed(): string {
  const tsxCli = path.join(SERVER_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCli, 'prisma/seed.ts'], {
    cwd: SERVER_ROOT,
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Seed failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

async function tableCounts() {
  return {
    users: await prisma.user.count(),
    courses: await prisma.course.count(),
    moderations: await prisma.courseModeration.count(),
    lessons: await prisma.lesson.count(),
    enrollments: await prisma.enrollment.count(),
    reviews: await prisma.review.count(),
    questions: await prisma.question.count(),
    answers: await prisma.answer.count(),
    submissions: await prisma.projectSubmission.count(),
    progress: await prisma.lessonProgress.count(),
  };
}

let firstRun: Awaited<ReturnType<typeof tableCounts>>;

beforeAll(async () => {
  runSeed();
  firstRun = await tableCounts();
  runSeed(); // lần 2: phải ra đúng cùng kết quả
}, 120_000);

describe('seed', () => {
  it('is idempotent: running twice gives the same data set', async () => {
    expect(await tableCounts()).toEqual(firstRun);
  });

  it('matches the volumes required by PLAN §11', async () => {
    expect(await prisma.category.count()).toBe(6);
    const tags = await prisma.tag.findMany();
    expect(tags.length).toBeGreaterThanOrEqual(15);
    expect(
      tags
        .filter((t) => t.isHot)
        .map((t) => t.name)
        .sort(),
    ).toEqual(
      [
        'Digital marketing',
        'Java',
        'Javascript',
        'Photoshop',
        'Python',
        'SQL',
        'Watercolor',
      ].sort(),
    );
    const teachers = await prisma.teacherProfile.count();
    expect(teachers).toBeGreaterThanOrEqual(8);
    expect(teachers).toBeLessThanOrEqual(10);

    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include: { sections: { include: { lessons: true } } },
    });
    expect(courses.length).toBeGreaterThanOrEqual(25);
    expect(courses.length).toBeLessThanOrEqual(30);
    expect(courses.filter((c) => c.priceCents === 0).length).toBeGreaterThanOrEqual(3);
    expect(courses.some((c) => c.isBestSeller)).toBe(true);
    expect(courses.some((c) => c.isFeatured)).toBe(true);
    expect(courses.some((c) => c.originalPriceCents !== null)).toBe(true);
    for (const course of courses) {
      const lessons = course.sections.flatMap((s) => s.lessons);
      expect(course.sections.length).toBeGreaterThanOrEqual(3);
      expect(course.sections.length).toBeLessThanOrEqual(4);
      expect(lessons.length).toBeGreaterThanOrEqual(8);
      expect(lessons.length).toBeLessThanOrEqual(15);
      expect(lessons.filter((l) => l.isPreview)).toHaveLength(2);
      expect(course.benefits.length).toBeGreaterThan(0);
      expect(course.benefits.join(' ').toLowerCase()).not.toContain('certificate');
      expect(course.projectDescription).toBeTruthy();
    }
    expect(await prisma.resource.count()).toBe(courses.length * 2);
    expect(await prisma.banner.count()).toBeGreaterThanOrEqual(2);
  });

  it('seeds the teacher/admin workflow data (PLAN §2.4.5, BR-30)', async () => {
    expect(await prisma.course.count({ where: { status: 'PUBLISHED' } })).toBe(30);
    expect(await prisma.course.count({ where: { status: 'PUBLISHED', publishedAt: null } })).toBe(
      0,
    );

    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).toMatchObject({ role: 'ADMIN' });
    expect(admin?.emailVerifiedAt).not.toBeNull();

    const draft = await prisma.course.findMany({
      where: { status: 'DRAFT' },
      include: { sections: { include: { lessons: true } }, teacher: true },
    });
    const pending = await prisma.course.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { sections: { include: { lessons: true } }, teacher: true },
    });
    expect(draft).toHaveLength(1);
    expect(pending).toHaveLength(1);
    for (const course of [...draft, ...pending]) {
      const lessons = course.sections.flatMap((section) => section.lessons);
      expect(course.sections.length).toBeGreaterThanOrEqual(1);
      expect(lessons.length).toBeGreaterThanOrEqual(3);
      expect(lessons.every((l) => l.videoUrl.startsWith('https://www.youtube.com/watch?v='))).toBe(
        true,
      );
      expect(course.publishedAt).toBeNull();
      expect(course.lessonCount).toBe(lessons.length);
    }
    expect(pending[0]?.submittedAt).not.toBeNull();
    expect(await prisma.courseModeration.count({ where: { action: 'SUBMITTED' } })).toBe(1);
  });

  it('keeps denormalized counters consistent with the source rows', async () => {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        reviews: { select: { rating: true } },
        _count: { select: { enrollments: true, likes: true } },
        sections: { include: { lessons: { select: { durationSec: true } } } },
      },
    });
    for (const c of courses) {
      const lessons = c.sections.flatMap((s) => s.lessons);
      const avg = c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length;
      expect(c.ratingCount).toBe(c.reviews.length);
      expect(c.ratingAvg).toBeCloseTo(Math.round(avg * 10) / 10, 5);
      expect(c.enrollmentCount).toBe(c._count.enrollments);
      expect(c.likeCount).toBe(c._count.likes);
      expect(c.lessonCount).toBe(lessons.length);
      expect(c.totalDurationSec).toBe(lessons.reduce((sum, l) => sum + l.durationSec, 0));
      expect(c.reviews.length).toBeGreaterThanOrEqual(5);
      expect(c.reviews.length).toBeLessThanOrEqual(20);
    }
    const questions = await prisma.question.findMany({
      include: { _count: { select: { answers: true, likes: true } } },
    });
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.answerCount).toBe(q._count.answers);
      expect(q.likeCount).toBe(q._count.likes);
    }
  });

  it('only lets enrolled learners review, ask, answer and submit (BR-08, BR-09)', async () => {
    const enrolled = new Set(
      (await prisma.enrollment.findMany({ select: { userId: true, courseId: true } })).map(
        (e) => `${e.userId}|${e.courseId}`,
      ),
    );
    const reviews = await prisma.review.findMany({ select: { userId: true, courseId: true } });
    const questions = await prisma.question.findMany({ select: { userId: true, courseId: true } });
    const submissions = await prisma.projectSubmission.findMany({
      select: { userId: true, courseId: true },
    });
    for (const row of [...reviews, ...questions, ...submissions]) {
      expect(enrolled.has(`${row.userId}|${row.courseId}`)).toBe(true);
    }
    const answers = await prisma.answer.findMany({
      select: { userId: true, question: { select: { courseId: true } } },
    });
    for (const a of answers) expect(enrolled.has(`${a.userId}|${a.question.courseId}`)).toBe(true);
  });

  it('builds the demo account exactly like the design (My Courses + User Profile)', async () => {
    const demo = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_ACCOUNT.email } });
    expect(demo.fullName).toBe('Martha Rosie');
    expect(demo.headline).toBe('UX/UI Designer');

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: demo.id },
      include: { course: { select: { title: true } } },
      orderBy: { lastAccessedAt: 'desc' },
    });
    expect(enrollments.map((e) => [e.course.title, e.progressPercent])).toEqual([
      ['UX Foundation', 30],
      ['Creative Art Design', 70],
      ['Palettes for Your App', 100],
      ['Typography in UI Design', 50],
    ]);
    expect(enrollments.filter((e) => e.completedAt !== null)).toHaveLength(1);
    expect(
      await prisma.lessonProgress.count({ where: { userId: demo.id, isCompleted: true } }),
    ).toBe(3 + 7 + 10 + 5);

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: demo.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { title: true } } },
    });
    expect(bookmarks.map((b) => b.course.title)).toEqual([
      'Product Design',
      'Website Design',
      'Mobile UI Design',
      'Digital Portrait',
    ]);
    const notifications = await prisma.notification.findMany({ where: { userId: demo.id } });
    expect(notifications).toHaveLength(3);
    expect(notifications.filter((n) => !n.isRead)).toHaveLength(2);
  });

  it('seeds verified accounts without 2FA so the demo can sign in right away', async () => {
    expect(await prisma.user.count({ where: { emailVerifiedAt: null } })).toBe(0);
    expect(await prisma.user.count({ where: { totpEnabledAt: { not: null } } })).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  });

  it('lets the demo account log in and reads seeded catalog data through the API', async () => {
    const api = createTestApi();
    const login = await api
      .post(`${API}/auth/login`)
      .send({ email: DEMO_ACCOUNT.email, password: SEED_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.twoFactorRequired).toBe(false);
    expect(login.body.data.accessToken).toEqual(expect.any(String));
    expect(login.body.data.token).toBe(login.body.data.accessToken);
    expect(login.body.data.user.fullName).toBe('Martha Rosie');

    const categories = await api.get(`${API}/categories`);
    expect(categories.body.data.map((c: { name: string }) => c.name)).toEqual([
      'Business',
      'Design',
      'Code',
      'Writing',
      'Movie',
      'Language',
    ]);
    const total = (categories.body.data as { courseCount: number }[]).reduce(
      (s, c) => s + c.courseCount,
      0,
    );
    expect(total).toBe(await prisma.course.count({ where: { status: 'PUBLISHED' } }));

    const hot = await api.get(`${API}/tags/hot`);
    expect(hot.body.data).toHaveLength(7);
  });
});
