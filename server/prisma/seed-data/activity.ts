/**
 * Sinh hoạt động của học viên (ghi danh, tiến độ, đơn hàng, đánh giá, Q&A, bookmark, bài nộp, thông báo...)
 * trong bộ nhớ, dùng PRNG có seed nên mỗi lần chạy cho cùng kết quả. KHÔNG chạm DB.
 *
 * Tài khoản demo (Martha Rosie) được dựng cố định, khớp design:
 *   My Courses  : UX Foundation 30 % - Creative Art Design 70 % - Palettes for Your App 100 % - Typography in UI Design 50 %
 *   User Profile: đã lưu Product Design, Website Design, Mobile UI Design, Digital Portrait
 * Các học viên còn lại được chọn ngẫu nhiên; chỉ người đã ghi danh mới review / hỏi đáp / nộp project (BR-08, BR-09).
 */
import type { Prisma } from '../../src/generated/prisma/client';
import { notificationMessage } from '../../src/lib/notificationMessage';
import { notificationData } from '../../src/lib/notify';
import { type Catalog, type CourseRow } from './catalog';
import { type CategorySlug } from './categories';
import { courseId, type Popularity } from './courses';
import { PHOTO, unsplash } from './media';
import { type Random } from './random';
import { TEACHERS } from './teachers';
import {
  ANSWER_TEXTS,
  questionPool,
  REVIEW_TEXTS,
  SUBMISSION_DESCRIPTIONS,
  SUBMISSION_TITLES,
} from './texts';
import { DEMO_ACCOUNT, STUDENTS, type UserSeed } from './users';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type Activity = {
  enrollments: Prisma.EnrollmentCreateManyInput[];
  lessonProgress: Prisma.LessonProgressCreateManyInput[];
  orders: Prisma.OrderCreateManyInput[];
  orderItems: Prisma.OrderItemCreateManyInput[];
  reviews: Prisma.ReviewCreateManyInput[];
  questions: Prisma.QuestionCreateManyInput[];
  answers: Prisma.AnswerCreateManyInput[];
  questionLikes: Prisma.QuestionLikeCreateManyInput[];
  bookmarks: Prisma.BookmarkCreateManyInput[];
  courseLikes: Prisma.CourseLikeCreateManyInput[];
  follows: Prisma.FollowCreateManyInput[];
  submissions: Prisma.ProjectSubmissionCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
  banners: Prisma.BannerCreateManyInput[];
};

/** Tiến độ cố định của tài khoản demo (thứ tự = thứ tự hiển thị My Courses trong design). */
export const DEMO_ENROLLMENTS = [
  { slug: 'ux-foundation', percent: 30, accessedHoursAgo: 1 },
  { slug: 'creative-art-design', percent: 70, accessedHoursAgo: 24 },
  { slug: 'palettes-for-your-app', percent: 100, accessedHoursAgo: 72 },
  { slug: 'typography-in-ui-design', percent: 50, accessedHoursAgo: 120 },
] as const;

/** Khóa demo đã lưu (thứ tự = thứ tự hiển thị User Profile trong design). */
export const DEMO_BOOKMARKS = [
  'product-design',
  'website-design',
  'mobile-ui-design',
  'digital-portrait',
] as const;

const ENROLL_RANGE: Record<Popularity, [number, number]> = {
  high: [12, 19],
  mid: [8, 13],
  low: [5, 8],
};

// Phân bố sao [5, 4, 3, 2, 1] theo "chất lượng" khóa học.
const RATING_PROFILES: [number, number, number, number, number][] = [
  [65, 27, 6, 1, 1], // rất tốt
  [45, 35, 15, 4, 1], // tốt
  [30, 35, 25, 8, 2], // tạm được
];

const SUBMISSION_PHOTOS: Record<CategorySlug, string[]> = {
  design: [
    PHOTO.patternCorridor,
    PHOTO.abstractPainting,
    PHOTO.swatches,
    PHOTO.phoneUi,
    PHOTO.monitorDesign,
    PHOTO.ribbons,
    PHOTO.pencils,
    PHOTO.posters,
    PHOTO.interiorChair,
    PHOTO.laptopDesign,
    PHOTO.sketchWireframe,
    PHOTO.paintBrushes,
  ],
  code: [
    PHOTO.codeLaptop,
    PHOTO.codeJs,
    PHOTO.codeJava,
    PHOTO.codePython,
    PHOTO.codePhp,
    PHOTO.dataDashboard,
  ],
  business: [
    PHOTO.teamWhiteboard,
    PHOTO.analytics,
    PHOTO.dataDashboard,
    PHOTO.teamLaptops,
    PHOTO.lecture,
  ],
  writing: [PHOTO.fountainPen, PHOTO.deskCoffee, PHOTO.openBook, PHOTO.studyDesk],
  movie: [PHOTO.clapperboard, PHOTO.cinema, PHOTO.videoEditing, PHOTO.timeline, PHOTO.posters],
  language: [
    PHOTO.friendsTalking,
    PHOTO.travelMap,
    PHOTO.loveToLearn,
    PHOTO.lecture,
    PHOTO.studyDesk,
  ],
};

type Enrollment = {
  userId: string;
  course: CourseRow;
  doneCount: number;
  enrolledAt: number;
  lastAccessedAt: number;
};

const fill = (text: string, title: string): string => text.replaceAll('{title}', title);
const at = (ms: number): Date => new Date(Math.round(ms));

/** Thời điểm ngẫu nhiên trong khoảng [from, now]. */
function randomTimeAfter(rng: Random, from: number, now: number): number {
  return from + rng.next() * Math.max(0, now - from);
}

export function buildActivity(catalog: Catalog, now: number, rng: Random): Activity {
  const bySlug = new Map(catalog.courses.map((c) => [c.seed.slug, c]));
  const course = (slug: string): CourseRow => {
    const found = bySlug.get(slug);
    if (!found) throw new Error(`Unknown course "${slug}" in seed data`);
    return found;
  };
  const others = STUDENTS.filter((s) => s.id !== DEMO_ACCOUNT.id);
  const userName = new Map(STUDENTS.map((s) => [s.id, s.fullName]));

  const activity: Activity = {
    enrollments: [],
    lessonProgress: [],
    orders: [],
    orderItems: [],
    reviews: [],
    questions: [],
    answers: [],
    questionLikes: [],
    bookmarks: [],
    courseLikes: [],
    follows: [],
    submissions: [],
    notifications: [],
    banners: [],
  };

  // ------------------------------------------------------------ Ghi danh + tiến độ
  const plans: Enrollment[] = [];
  for (const demo of DEMO_ENROLLMENTS) {
    const c = course(demo.slug);
    const doneCount = Math.round((demo.percent / 100) * c.lessons.length);
    const enrolledAt = now - 30 * DAY_MS;
    plans.push({
      userId: DEMO_ACCOUNT.id,
      course: c,
      doneCount,
      enrolledAt,
      lastAccessedAt: now - demo.accessedHoursAgo * HOUR_MS,
    });
  }
  const enrolledOthers = new Map<string, UserSeed[]>(); // courseId -> học viên (không gồm demo)
  for (const c of catalog.courses) {
    const [min, max] = ENROLL_RANGE[c.seed.popularity];
    const students = rng.sample(others, rng.int(min, max));
    enrolledOthers.set(c.id, students);
    for (const student of students) {
      const total = c.lessons.length;
      const roll = rng.next();
      const doneCount = roll < 0.2 ? 0 : roll < 0.7 ? rng.int(1, total - 1) : total;
      const enrolledAt = now - rng.int(2, Math.max(3, Math.min(c.seed.ageDays, 150))) * DAY_MS;
      plans.push({
        userId: student.id,
        course: c,
        doneCount,
        enrolledAt,
        lastAccessedAt: randomTimeAfter(rng, enrolledAt, now),
      });
    }
  }
  const enrolledAtOf = new Map(plans.map((p) => [`${p.userId}|${p.course.id}`, p.enrolledAt]));

  let orderNo = 0;
  for (const plan of plans) {
    const total = plan.course.lessons.length;
    const done = plan.doneCount;
    const percent = Math.round((done / total) * 100);
    activity.enrollments.push({
      id: `enr_${plan.userId.slice(4)}_${plan.course.id.slice(4)}`,
      userId: plan.userId,
      courseId: plan.course.id,
      progressPercent: percent,
      lastLessonId:
        done === 0 ? null : (plan.course.lessons[Math.min(done, total - 1)]?.id ?? null),
      lastAccessedAt: at(plan.lastAccessedAt),
      enrolledAt: at(plan.enrolledAt),
      completedAt: done === total ? at(plan.lastAccessedAt) : null,
    });
    plan.course.lessons.slice(0, done).forEach((lesson, i) => {
      activity.lessonProgress.push({
        userId: plan.userId,
        lessonId: lesson.id,
        positionSec: lesson.durationSec,
        isCompleted: true,
        updatedAt: at(plan.lastAccessedAt - (done - i) * 20 * 60 * 1000),
      });
    });
    const current = plan.course.lessons[done];
    if (done > 0 && current) {
      activity.lessonProgress.push({
        userId: plan.userId,
        lessonId: current.id,
        positionSec: rng.int(1, Math.max(1, current.durationSec - 1)),
        isCompleted: false,
        updatedAt: at(plan.lastAccessedAt),
      });
    }
    if (plan.course.seed.priceCents > 0) {
      orderNo += 1;
      const orderId = `ord_${String(orderNo).padStart(4, '0')}`;
      activity.orders.push({
        id: orderId,
        userId: plan.userId,
        totalCents: plan.course.seed.priceCents,
        status: 'PAID',
        paymentMethod: rng.chance(0.7) ? 'MOCK_CARD' : 'MOCK_EWALLET',
        createdAt: at(plan.enrolledAt),
        paidAt: at(plan.enrolledAt),
      });
      activity.orderItems.push({
        id: `oit_${String(orderNo).padStart(4, '0')}`,
        orderId,
        courseId: plan.course.id,
        priceCents: plan.course.seed.priceCents,
      });
    }
  }

  // ------------------------------------------------------------ Đánh giá, Q&A, bài nộp
  for (const c of catalog.courses) {
    const pool = enrolledOthers.get(c.id) ?? [];
    const slug = c.id.slice(4);
    const enrolledAt = (u: UserSeed): number => enrolledAtOf.get(`${u.id}|${c.id}`) ?? now - DAY_MS;

    // Reviews 5-20 / khóa (tối đa bằng số học viên đã ghi danh, mỗi người 1 review)
    const profile = rng.weighted<number[]>([
      [RATING_PROFILES[0] as number[], 4],
      [RATING_PROFILES[1] as number[], 4.5],
      [RATING_PROFILES[2] as number[], 1.5],
    ]);
    const reviewers = rng.sample(pool, rng.int(5, Math.min(20, pool.length)));
    reviewers.forEach((user, i) => {
      const rating = rng.weighted<1 | 2 | 3 | 4 | 5>([
        [5, profile[0] as number],
        [4, profile[1] as number],
        [3, profile[2] as number],
        [2, profile[3] as number],
        [1, profile[4] as number],
      ]);
      activity.reviews.push({
        id: `rev_${slug}_${i + 1}`,
        userId: user.id,
        courseId: c.id,
        rating,
        content: fill(rng.pick(REVIEW_TEXTS[rating]), c.seed.title),
        createdAt: at(randomTimeAfter(rng, enrolledAt(user), now)),
      });
    });

    // Questions 3-6 / khóa, mỗi câu 0-5 trả lời
    const askers = rng.sample(pool, rng.int(3, 6));
    const texts = rng.sample(questionPool(c.seed.category), askers.length);
    askers.forEach((asker, i) => {
      const questionId = `q_${slug}_${i + 1}`;
      const createdAt = randomTimeAfter(rng, enrolledAt(asker), now - 2 * HOUR_MS);
      activity.questions.push({
        id: questionId,
        courseId: c.id,
        userId: asker.id,
        content: fill(texts[i] ?? '', c.seed.title),
        createdAt: at(createdAt),
      });
      const answerCount = rng.weighted([
        [0, 2],
        [1, 3],
        [2, 3],
        [3, 2],
        [4, 1],
        [5, 0.5],
      ] as const);
      const answerers = rng.sample(
        pool.filter((u) => u.id !== asker.id),
        answerCount,
      );
      const answerTexts = rng.sample(ANSWER_TEXTS, answerers.length);
      answerers.forEach((user, j) => {
        activity.answers.push({
          id: `a_${slug}_${i + 1}_${j + 1}`,
          questionId,
          userId: user.id,
          content: answerTexts[j] ?? ANSWER_TEXTS[0] ?? '',
          createdAt: at(Math.min(now, createdAt + rng.int(1, 72) * HOUR_MS)),
        });
      });
      rng.sample(pool, rng.int(0, Math.min(5, pool.length))).forEach((user) => {
        activity.questionLikes.push({
          userId: user.id,
          questionId,
          createdAt: at(randomTimeAfter(rng, createdAt, now)),
        });
      });
    });

    // Project submissions 3-12 / khóa
    const photoPool = SUBMISSION_PHOTOS[c.seed.category];
    const submitters = rng.sample(pool, rng.int(3, Math.min(12, pool.length)));
    submitters.forEach((user, i) => {
      const imageUrl = unsplash(rng.pick(photoPool), 800);
      activity.submissions.push({
        id: `sub_${slug}_${i + 1}`,
        courseId: c.id,
        userId: user.id,
        title: fill(rng.pick(SUBMISSION_TITLES), c.seed.title),
        description: rng.pick(SUBMISSION_DESCRIPTIONS),
        imageUrl,
        fileUrl: imageUrl,
        createdAt: at(randomTimeAfter(rng, enrolledAt(user), now)),
      });
    });
  }

  addDemoContent(activity, now, rng, { course, enrolledOthers, userName });

  // ------------------------------------------------------------ Bookmark, like, follow của học viên khác
  const courses = catalog.courses;
  for (const student of others) {
    rng.sample(courses, rng.int(2, 7)).forEach((c) => {
      activity.bookmarks.push({
        userId: student.id,
        courseId: c.id,
        createdAt: at(now - rng.int(1, 60) * DAY_MS),
      });
    });
    rng.sample(courses, rng.int(0, 6)).forEach((c) => {
      activity.courseLikes.push({
        userId: student.id,
        courseId: c.id,
        createdAt: at(now - rng.int(1, 60) * DAY_MS),
      });
    });
    rng.sample(TEACHERS, rng.int(1, 4)).forEach((t) => {
      activity.follows.push({
        userId: student.id,
        teacherId: t.profileId,
        createdAt: at(now - rng.int(1, 90) * DAY_MS),
      });
    });
  }

  activity.banners.push(...buildBanners());
  return activity;
}

type DemoHelpers = {
  course: (slug: string) => CourseRow;
  enrolledOthers: Map<string, UserSeed[]>;
  userName: Map<string, string>;
};

/** Phần dữ liệu riêng của tài khoản demo: bookmark, review, câu hỏi, bài nộp, thông báo. */
function addDemoContent(activity: Activity, now: number, rng: Random, helpers: DemoHelpers): void {
  const { course, enrolledOthers, userName } = helpers;
  const demoId = DEMO_ACCOUNT.id;

  DEMO_BOOKMARKS.forEach((slug, i) => {
    activity.bookmarks.push({
      userId: demoId,
      courseId: course(slug).id,
      createdAt: at(now - (i + 1) * DAY_MS),
    });
  });
  ['website-design', 'python-introduction'].forEach((slug, i) => {
    activity.courseLikes.push({
      userId: demoId,
      courseId: course(slug).id,
      createdAt: at(now - (i + 2) * DAY_MS),
    });
  });
  ['ramono', 'sara'].forEach((key, i) => {
    activity.follows.push({
      userId: demoId,
      teacherId: `tch_${key}`,
      createdAt: at(now - (i + 5) * DAY_MS),
    });
  });

  // Review của Martha cho khóa đã hoàn thành
  const palettes = course('palettes-for-your-app');
  activity.reviews.push({
    id: `rev_${palettes.id.slice(4)}_martha`,
    userId: demoId,
    courseId: palettes.id,
    rating: 5,
    content:
      'Practical and beautifully explained. The contrast lessons changed how I choose colours for every app I design.',
    createdAt: at(now - 2 * DAY_MS),
  });

  // Bài nộp của Martha
  const paletteImage = unsplash(PHOTO.swatches, 800);
  activity.submissions.push({
    id: `sub_${palettes.id.slice(4)}_martha`,
    courseId: palettes.id,
    userId: demoId,
    title: 'Palette for a habit-tracking app',
    description: 'A calm teal and purple palette that passes AA contrast in light and dark mode.',
    imageUrl: paletteImage,
    fileUrl: paletteImage,
    createdAt: at(now - 2 * DAY_MS),
  });

  // Câu hỏi của Martha + 1 câu trả lời -> thông báo NEW_ANSWER chưa đọc
  const typography = course('typography-in-ui-design');
  const answerer = (enrolledOthers.get(typography.id) ?? [])[0];
  if (!answerer) throw new Error('Khóa Typography chưa có học viên nào để trả lời câu hỏi demo');
  const questionId = `q_${typography.id.slice(4)}_martha`;
  activity.questions.push({
    id: questionId,
    courseId: typography.id,
    userId: demoId,
    content: 'How many fonts should I use in one project?',
    createdAt: at(now - 2 * DAY_MS),
  });
  activity.answers.push({
    id: `a_${typography.id.slice(4)}_martha_1`,
    questionId,
    userId: answerer.id,
    content:
      'Two is usually enough: one for headings and one for body text. Vary weight and size instead of adding fonts.',
    createdAt: at(now - 3 * HOUR_MS),
  });
  rng.sample(enrolledOthers.get(typography.id) ?? [], 3).forEach((user) => {
    activity.questionLikes.push({ userId: user.id, questionId, createdAt: at(now - DAY_MS) });
  });

  const uxFoundation = course('ux-foundation');
  const paid = notificationMessage('ORDER_PAID_ONE', { courseTitle: uxFoundation.seed.title });
  const completed = notificationMessage('COURSE_COMPLETED', { courseTitle: palettes.seed.title });
  const answered = notificationMessage('NEW_ANSWER', {
    author: userName.get(answerer.id) ?? 'A learner',
    courseTitle: typography.seed.title,
  });
  activity.notifications.push(
    {
      id: 'ntf_demo_1',
      userId: demoId,
      type: paid.type,
      title: paid.title,
      body: paid.body,
      data: notificationData(paid, { courseId: uxFoundation.id }),
      isRead: true,
      createdAt: at(now - 20 * DAY_MS),
    },
    {
      id: 'ntf_demo_2',
      userId: demoId,
      type: completed.type,
      title: completed.title,
      body: completed.body,
      data: notificationData(completed, { courseId: palettes.id }),
      isRead: false,
      createdAt: at(now - 3 * DAY_MS),
    },
    {
      id: 'ntf_demo_3',
      userId: demoId,
      type: answered.type,
      title: answered.title,
      body: answered.body,
      data: notificationData(answered, { courseId: typography.id, questionId }),
      isRead: false,
      createdAt: at(now - 3 * HOUR_MS),
    },
  );
}

function buildBanners(): Prisma.BannerCreateManyInput[] {
  return [
    {
      id: 'ban_project_management',
      title: 'PROJECT MANAGEMENT',
      subtitle: '20% OFF',
      ctaText: 'JOIN NOW',
      imageUrl: unsplash(PHOTO.teamWhiteboard, 800),
      bgColor: '#8353E2',
      targetType: 'COURSE',
      targetId: courseId('project-management-essentials'),
      order: 1,
      isActive: true,
    },
    {
      id: 'ban_learn_to_code',
      title: 'LEARN TO CODE',
      subtitle: 'BEST-SELLERS',
      ctaText: 'START NOW',
      imageUrl: unsplash(PHOTO.codeLaptop, 800),
      bgColor: '#4069E5',
      targetType: 'CATEGORY',
      targetId: 'cat_code',
      order: 2,
      isActive: true,
    },
    {
      id: 'ban_master_ux',
      title: 'MASTER UX DESIGN',
      subtitle: 'NEW COURSES',
      ctaText: 'EXPLORE',
      imageUrl: unsplash(PHOTO.tabletWireframe, 800),
      bgColor: '#8353E2',
      targetType: 'CATEGORY',
      targetId: 'cat_design',
      order: 3,
      isActive: true,
    },
  ];
}
