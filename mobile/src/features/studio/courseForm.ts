import { z } from 'zod';

import { tr } from '@/i18n';
import type {
  CourseRevisionInput,
  CourseRevisionPayload,
  CreateStudioCourseRequest,
  StudioCourseDetailDto,
  StudioCourseInfoInput,
} from '@/types/api';

import { STUDIO_LIMITS } from './limits';
import { centsToUsdText, parseUsdToCents } from './money';

/** Everything the course info form edits (SC-24). Prices are USD text; lists are plain arrays. */
export type CourseFormValues = {
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  tagIds: string[];
  price: string;
  originalPrice: string;
  benefits: string[];
  projectDescription: string;
  thumbnailUrl: string;
};

/** Fields a PUBLISHED course still saves directly (BR-21). */
export const MINOR_FIELDS = [
  'subtitle',
  'description',
  'benefits',
  'projectDescription',
  'thumbnailUrl',
] as const;
/** Fields a PUBLISHED course can only change through a revision. */
export const MAJOR_FIELDS = ['title', 'categoryId', 'tagIds', 'price', 'originalPrice'] as const;

export type MinorField = (typeof MINOR_FIELDS)[number];
export type MajorField = (typeof MAJOR_FIELDS)[number];

export function isMajorField(name: string): name is MajorField {
  return (MAJOR_FIELDS as readonly string[]).includes(name);
}

export const EMPTY_COURSE_FORM: CourseFormValues = {
  title: '',
  subtitle: '',
  description: '',
  categoryId: '',
  tagIds: [],
  price: '',
  originalPrice: '',
  benefits: [],
  projectDescription: '',
  thumbnailUrl: '',
};

const msg = (key: string, options?: Record<string, unknown>) => () =>
  tr(`studio:validation.${key}`, options);

/** Price field: empty (= free) or a USD amount with at most 2 decimals, up to $999.99. */
function isPriceText(value: string): boolean {
  return Number.isFinite(parseUsdToCents(value, 0));
}

/** Messages are lazy (`error: () => ...`) so they follow the language active when validating. */
export const courseFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(STUDIO_LIMITS.titleMin, { error: msg('titleMin', { count: STUDIO_LIMITS.titleMin }) })
    .max(STUDIO_LIMITS.titleMax, { error: msg('titleMax', { count: STUDIO_LIMITS.titleMax }) }),
  subtitle: z
    .string()
    .trim()
    .max(STUDIO_LIMITS.subtitleMax, {
      error: msg('subtitleMax', { count: STUDIO_LIMITS.subtitleMax }),
    }),
  description: z
    .string()
    .trim()
    .max(STUDIO_LIMITS.descriptionMax, {
      error: msg('descriptionMax', { count: STUDIO_LIMITS.descriptionMax }),
    }),
  categoryId: z.string().min(1, { error: msg('categoryRequired') }),
  tagIds: z.array(z.string()).max(STUDIO_LIMITS.maxTags, {
    error: msg('tagsMax', { count: STUDIO_LIMITS.maxTags }),
  }),
  price: z.string().refine(isPriceText, { error: msg('priceInvalid') }),
  originalPrice: z.string().refine(isPriceText, { error: msg('priceInvalid') }),
  benefits: z.array(z.string()).max(STUDIO_LIMITS.maxBenefits),
  projectDescription: z
    .string()
    .trim()
    .max(STUDIO_LIMITS.projectDescriptionMax, {
      error: msg('projectMax', { count: STUDIO_LIMITS.projectDescriptionMax }),
    }),
  thumbnailUrl: z.string(),
});

/** Non-empty trimmed benefit lines. */
export function cleanBenefits(benefits: readonly string[]): string[] {
  return benefits
    .map((line) => line.trim().slice(0, STUDIO_LIMITS.benefitMax))
    .filter((line) => line.length > 0)
    .slice(0, STUDIO_LIMITS.maxBenefits);
}

/**
 * Form values of an existing course. The major fields come from the open revision when there is
 * one (the revision is what the teacher is editing), else from the live course.
 */
export function valuesFromDetail(detail: StudioCourseDetailDto): CourseFormValues {
  const revision = detail.revision?.payload;
  return {
    title: revision?.title ?? detail.title,
    subtitle: detail.subtitle ?? '',
    description: detail.description,
    categoryId: revision?.categoryId ?? detail.category.id,
    tagIds: revision?.tagIds ?? detail.tags.map((tag) => tag.id),
    price: centsToUsdText(revision?.priceCents ?? detail.priceCents),
    originalPrice: centsToUsdText(
      revision ? revision.originalPriceCents : detail.originalPriceCents,
    ),
    benefits: detail.benefits,
    projectDescription: detail.projectDescription ?? '',
    thumbnailUrl: detail.thumbnailUrl,
  };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** `originalPrice` text -> cents or `null` (empty clears it). */
function originalCents(values: CourseFormValues): number | null {
  return values.originalPrice.trim() === '' ? null : parseUsdToCents(values.originalPrice, 0);
}

/** Body of `POST /teacher/courses`: title + category, plus whatever else was filled in. */
export function toCreateRequest(values: CourseFormValues): CreateStudioCourseRequest {
  const request: CreateStudioCourseRequest = {
    title: values.title.trim(),
    categoryId: values.categoryId,
    priceCents: parseUsdToCents(values.price, 0),
    originalPriceCents: originalCents(values),
    tagIds: values.tagIds,
    benefits: cleanBenefits(values.benefits),
  };
  if (values.subtitle.trim()) request.subtitle = values.subtitle.trim();
  if (values.description.trim()) request.description = values.description.trim();
  if (values.projectDescription.trim())
    request.projectDescription = values.projectDescription.trim();
  if (values.thumbnailUrl) request.thumbnailUrl = values.thumbnailUrl;
  return request;
}

type FieldScope = 'all' | 'minor' | 'major';

/**
 * Only the info fields that differ from `initial` (PATCH sends what changed). `scope` limits the
 * result to minor or major fields (a PUBLISHED course PATCHes the minor ones only).
 */
export function getInfoChanges(
  initial: CourseFormValues,
  values: CourseFormValues,
  scope: FieldScope = 'all',
): Partial<StudioCourseInfoInput> {
  const changes: Partial<StudioCourseInfoInput> = {};
  const isMinor = scope !== 'major';
  const isMajor = scope !== 'minor';
  if (isMajor) {
    if (values.title.trim() !== initial.title.trim()) changes.title = values.title.trim();
    if (values.categoryId !== initial.categoryId) changes.categoryId = values.categoryId;
    if (!sameList(values.tagIds, initial.tagIds)) changes.tagIds = values.tagIds;
    if (parseUsdToCents(values.price, 0) !== parseUsdToCents(initial.price, 0)) {
      changes.priceCents = parseUsdToCents(values.price, 0);
    }
    if (originalCents(values) !== originalCents(initial)) {
      changes.originalPriceCents = originalCents(values);
    }
  }
  if (isMinor) {
    if (values.subtitle.trim() !== initial.subtitle.trim()) {
      changes.subtitle = values.subtitle.trim() || null;
    }
    if (values.description.trim() !== initial.description.trim()) {
      changes.description = values.description.trim();
    }
    if (!sameList(cleanBenefits(values.benefits), cleanBenefits(initial.benefits))) {
      changes.benefits = cleanBenefits(values.benefits);
    }
    if (values.projectDescription.trim() !== initial.projectDescription.trim()) {
      changes.projectDescription = values.projectDescription.trim() || null;
    }
    if (values.thumbnailUrl !== initial.thumbnailUrl) changes.thumbnailUrl = values.thumbnailUrl;
  }
  return changes;
}

/** Body of `PUT /teacher/courses/:id/revision`: the stored payload with the major fields replaced. */
export function toRevisionInput(
  payload: CourseRevisionPayload,
  values: CourseFormValues,
): CourseRevisionInput {
  return {
    ...payload,
    title: values.title.trim(),
    categoryId: values.categoryId,
    tagIds: values.tagIds,
    priceCents: parseUsdToCents(values.price, 0),
    originalPriceCents: originalCents(values),
  };
}

/** Server field name -> form field name (`priceCents` is the `price` text field...). */
const SERVER_FIELD_MAP: Record<string, keyof CourseFormValues> = {
  title: 'title',
  subtitle: 'subtitle',
  description: 'description',
  categoryId: 'categoryId',
  tagIds: 'tagIds',
  priceCents: 'price',
  originalPriceCents: 'originalPrice',
  benefits: 'benefits',
  projectDescription: 'projectDescription',
  thumbnailUrl: 'thumbnailUrl',
};

/** Maps the `{ field: message }` of a 400 response onto form fields (unknown fields are dropped). */
export function mapServerFieldErrors(
  errors: Record<string, string>,
): Partial<Record<keyof CourseFormValues, string>> {
  const result: Partial<Record<keyof CourseFormValues, string>> = {};
  for (const [key, message] of Object.entries(errors)) {
    const root = key.split('.')[0] ?? key;
    const field = SERVER_FIELD_MAP[root];
    if (field && !(field in result)) result[field] = message;
  }
  return result;
}

const FORM_FIELDS = Object.keys(EMPTY_COURSE_FORM) as (keyof CourseFormValues)[];

/** `base` with the given fields taken from `source` (a step saves only the fields it owns). */
export function withFields(
  base: CourseFormValues,
  source: CourseFormValues,
  fields: readonly (keyof CourseFormValues)[],
): CourseFormValues {
  const result: CourseFormValues = { ...base };
  for (const field of fields) Object.assign(result, { [field]: source[field] });
  return result;
}

/**
 * New server values for the form, keeping what the teacher changed since `previous` was loaded:
 * a field the teacher did not touch (`current` equals `previous`) takes the `next` server value.
 */
export function mergeUntouched(
  previous: CourseFormValues,
  current: CourseFormValues,
  next: CourseFormValues,
): CourseFormValues {
  const merged: CourseFormValues = { ...next };
  for (const field of FORM_FIELDS) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(current[field])) {
      Object.assign(merged, { [field]: current[field] });
    }
  }
  return merged;
}

type PriceErrors = Partial<Record<'price' | 'originalPrice', string>>;

/**
 * Extra rules of the price step (BR-20): a paid course costs $0.99 - $999.99 and its original
 * price (optional) is higher than the price. The zod schema only checks the format; "paid" is a
 * UI choice, so this runs when the teacher leaves the step.
 */
export function getPriceErrors(values: CourseFormValues, isPaid: boolean): PriceErrors {
  const errors: PriceErrors = {};
  if (!isPaid) return errors;
  const price = parseUsdToCents(values.price, 0);
  if (price < STUDIO_LIMITS.priceMinPaidCents) {
    errors.price = tr('studio:validation.pricePaidMin');
  }
  const original = originalCents(values);
  if (original !== null && Number.isFinite(original) && original <= price) {
    errors.originalPrice = tr('studio:validation.originalPriceLow');
  }
  return errors;
}

/** Has the teacher changed anything compared to what is saved (or to an empty form)? */
export function hasInfoChanges(saved: CourseFormValues, values: CourseFormValues): boolean {
  return Object.keys(getInfoChanges(saved, values)).length > 0;
}
