import type {
  CourseStatus,
  StudioCourseDetailDto,
  StudioCourseSummaryDto,
  StudioLessonDto,
  StudioRevisionDto,
  StudioSectionDto,
} from '@/types/api';

/** Test data for the Studio features (a draft course with one section and one lesson). */
export function makeLesson(overrides: Partial<StudioLessonDto> = {}): StudioLessonDto {
  return {
    id: 'lesson-1',
    title: 'Install the tools',
    order: 1,
    durationSec: 754,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isPreview: false,
    content: '',
    ...overrides,
  };
}

export function makeSection(overrides: Partial<StudioSectionDto> = {}): StudioSectionDto {
  return {
    id: 'section-1',
    title: 'Getting started',
    order: 1,
    lessons: [makeLesson()],
    ...overrides,
  };
}

export function makeSummary(
  overrides: Partial<StudioCourseSummaryDto> = {},
): StudioCourseSummaryDto {
  return {
    id: 'course-1',
    title: 'React Native Bootcamp',
    thumbnailUrl: 'https://example.com/cover.png',
    status: 'DRAFT',
    category: { id: 'cat-1', name: 'Code' },
    priceCents: 2999,
    originalPriceCents: null,
    lessonCount: 1,
    totalDurationSec: 754,
    enrollmentCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    revisionStatus: null,
    rejectionReason: null,
    publishedAt: null,
    submittedAt: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...overrides,
  };
}

export function makeDetail(
  overrides: Partial<StudioCourseDetailDto> & { status?: CourseStatus } = {},
): StudioCourseDetailDto {
  return {
    ...makeSummary(),
    subtitle: 'Ship real apps',
    description: 'A long description of the course that explains what is taught.',
    benefits: ['Build apps', 'Publish them'],
    projectDescription: null,
    tags: [{ id: 'tag-1', name: 'React', isHot: true }],
    sections: [makeSection()],
    revision: null,
    moderation: [],
    missing: [],
    ...overrides,
  };
}

export function makeRevision(status: StudioRevisionDto['status']): StudioRevisionDto {
  return {
    id: 'rev-1',
    status,
    payload: {
      title: 'New title',
      priceCents: 1999,
      originalPriceCents: null,
      categoryId: 'cat-1',
      tagIds: [],
      sections: [],
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    submittedAt: null,
    missing: [],
    rejectionReason: null,
  };
}
