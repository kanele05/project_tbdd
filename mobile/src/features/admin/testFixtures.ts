import type {
  AdminCourseDetailDto,
  AdminCourseQueueItemDto,
  AdminRevisionDiffDto,
  AdminStatsDto,
  AdminUserDto,
  AiCourseReviewDto,
} from '@/types/api';

/** DTO factories shared by the admin tests. */

const ISO = '2026-10-10T08:00:00.000Z';

export function makeStats(overrides: Partial<AdminStatsDto> = {}): AdminStatsDto {
  return {
    users: {
      total: 120,
      byRole: { STUDENT: 100, TEACHER: 18, ADMIN: 2 },
      disabledCount: 3,
      newLast7d: 9,
      newLast30d: 31,
    },
    courses: {
      total: 20,
      byStatus: { DRAFT: 4, PENDING_REVIEW: 3, PUBLISHED: 10, REJECTED: 2, ARCHIVED: 1 },
    },
    pending: { courses: 3, revisions: 2, total: 5 },
    orders: { paidCount: 42, revenueCents: 123456 },
    topCourses: [
      {
        id: 'c1',
        title: 'React Native Basics',
        thumbnailUrl: '',
        teacher: { id: 't1', fullName: 'Sara Weise' },
        enrollmentCount: 77,
        revenueCents: 99900,
      },
    ],
    ...overrides,
  };
}

export function makeQueueItem(
  overrides: Partial<AdminCourseQueueItemDto> = {},
): AdminCourseQueueItemDto {
  return {
    id: 'c1',
    type: 'COURSE',
    title: 'Learn TypeScript',
    thumbnailUrl: '',
    status: 'PENDING_REVIEW',
    revisionStatus: null,
    teacher: { id: 't1', userId: 'u1', fullName: 'Sara Weise', avatarUrl: null },
    category: { id: 'cat1', name: 'Code' },
    priceCents: 4900,
    lessonCount: 12,
    submittedAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

export function makeDiff(overrides: Partial<AdminRevisionDiffDto> = {}): AdminRevisionDiffDto {
  return {
    hasChanges: true,
    title: { before: 'Old title', after: 'New title' },
    priceCents: { before: 4900, after: 5900 },
    originalPriceCents: null,
    category: null,
    tags: null,
    curriculum: {
      sectionsAdded: ['Advanced'],
      sectionsRemoved: [],
      sectionsRenamed: [],
      lessonsAdded: [{ id: null, title: 'Generics', sectionTitle: 'Advanced', durationSec: 600 }],
      lessonsRemoved: [
        {
          id: 'l9',
          title: 'Old intro',
          sectionTitle: 'Basics',
          durationSec: 120,
          progressCount: 4,
        },
      ],
      lessonsChanged: [
        {
          id: 'l2',
          sectionTitle: 'Basics',
          before: {
            title: 'Types',
            videoUrl: 'https://www.youtube.com/watch?v=aaa',
            durationSec: 300,
            isPreview: false,
            content: '',
          },
          after: {
            title: 'Types',
            videoUrl: 'https://www.youtube.com/watch?v=bbb',
            durationSec: 300,
            isPreview: false,
            content: '',
          },
          changedFields: ['videoUrl'],
        },
      ],
      isReordered: false,
    },
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<AdminCourseDetailDto> = {}): AdminCourseDetailDto {
  return {
    id: 'c1',
    title: 'Learn TypeScript',
    thumbnailUrl: '',
    status: 'PENDING_REVIEW',
    category: { id: 'cat1', name: 'Code' },
    priceCents: 4900,
    originalPriceCents: null,
    lessonCount: 2,
    totalDurationSec: 900,
    enrollmentCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    revisionStatus: null,
    rejectionReason: null,
    publishedAt: null,
    submittedAt: ISO,
    createdAt: ISO,
    updatedAt: ISO,
    subtitle: 'From zero to types',
    description: 'A long description of the course.',
    benefits: ['Type safety'],
    projectDescription: null,
    tags: [{ id: 'tag1', name: 'typescript', isHot: false }],
    sections: [
      {
        id: 's1',
        title: 'Basics',
        order: 1,
        lessons: [
          {
            id: 'l1',
            title: 'Intro lesson',
            order: 1,
            durationSec: 300,
            videoUrl: 'https://www.youtube.com/watch?v=abc',
            isPreview: true,
            content: 'Lesson notes here',
          },
          {
            id: 'l2',
            title: 'Types lesson',
            order: 2,
            durationSec: 600,
            videoUrl: '',
            isPreview: false,
            content: '',
          },
        ],
      },
    ],
    revision: null,
    moderation: [
      {
        id: 'm1',
        action: 'SUBMITTED',
        target: 'COURSE',
        reason: null,
        createdAt: ISO,
        actor: { id: 'u1', fullName: 'Sara Weise', role: 'TEACHER' },
      },
    ],
    missing: [],
    teacher: {
      id: 't1',
      userId: 'u1',
      fullName: 'Sara Weise',
      email: 'sara@example.com',
      avatarUrl: null,
      isDisabled: false,
    },
    reviewTarget: 'COURSE',
    diff: null,
    ...overrides,
  };
}

export function makeUser(overrides: Partial<AdminUserDto> = {}): AdminUserDto {
  return {
    id: 'u1',
    email: 'lan@example.com',
    fullName: 'Lan Nguyen',
    avatarUrl: null,
    role: 'STUDENT',
    createdAt: ISO,
    emailVerified: true,
    disabledAt: null,
    disabledReason: null,
    courseCount: 0,
    enrollmentCount: 3,
    ...overrides,
  };
}

export function makeAiReview(overrides: Partial<AiCourseReviewDto> = {}): AiCourseReviewDto {
  return {
    courseId: 'c1',
    target: 'COURSE',
    lang: 'en',
    verdict: 'NEEDS_ATTENTION',
    summary: 'Mostly fine, one pricing concern.',
    issues: [{ severity: 'high', area: 'pricing', message: 'Price looks too high for the scope.' }],
    model: 'mock',
    generatedAt: ISO,
    ...overrides,
  };
}
