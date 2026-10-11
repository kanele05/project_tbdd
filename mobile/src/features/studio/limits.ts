/**
 * Input limits of the course editor. They mirror `COURSE_LIMITS` of the server
 * (`server/src/lib/courseChecklist.ts`, PLAN BR-19...BR-21) so the forms reject early what the
 * API would reject with a 400.
 */
export const STUDIO_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  subtitleMax: 200,
  descriptionMin: 100,
  descriptionMax: 5000,
  benefitMax: 200,
  maxBenefits: 10,
  projectDescriptionMax: 2000,
  maxTags: 5,
  sectionTitleMax: 120,
  lessonTitleMax: 160,
  lessonContentMax: 3000,
  maxSections: 20,
  maxLessons: 100,
  minLessons: 3,
  maxPreviewLessons: 3,
  lessonMinSec: 1,
  lessonMaxSec: 6 * 60 * 60,
  /** Price in cents: 0 (free) up to 99 999; a paid course needs >= 99 to be submitted. */
  priceMaxCents: 99_999,
  priceMinPaidCents: 99,
  /** Cover image: PNG / JPG up to 5 MB. */
  coverMaxBytes: 5 * 1024 * 1024,
} as const;
