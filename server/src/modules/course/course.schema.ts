import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const COURSE_SORTS = ['popular', 'rating', 'newest', 'price_asc', 'price_desc'] as const;
export const COURSE_SECTIONS = ['popular', 'recommended', 'inspires'] as const;

export type CourseSort = (typeof COURSE_SORTS)[number];
export type CourseSection = (typeof COURSE_SECTIONS)[number];

/** `?x=` (giá trị rỗng) coi như không truyền. */
function optionalQuery<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

/** `categoryId=a,b` hoặc `categoryId=a&categoryId=b` -> ['a', 'b']. */
const idList = z.preprocess(
  (value) => (Array.isArray(value) ? value.join(',') : value),
  z
    .string()
    .transform((raw) =>
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(64)).max(20, 'At most 20 categories')),
);

/** `true|false|1|0` -> boolean (z.coerce.boolean sẽ coi "false" là true nên không dùng). */
const booleanQuery = z
  .enum(['true', 'false', '1', '0'], { error: 'Must be true or false' })
  .transform((value) => value === 'true' || value === '1');

export const listCoursesQuery = paginationQuery
  .extend({
    q: optionalQuery(z.string().trim().max(100, 'Search text is too long')),
    categoryId: optionalQuery(idList),
    teacherId: optionalQuery(z.string().trim().max(64)),
    isFree: optionalQuery(booleanQuery),
    minPrice: optionalQuery(z.coerce.number().int().min(0)),
    maxPrice: optionalQuery(z.coerce.number().int().min(0)),
    minRating: optionalQuery(z.coerce.number().min(0).max(5)),
    sort: optionalQuery(z.enum(COURSE_SORTS)),
    section: optionalQuery(z.enum(COURSE_SECTIONS)),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      path: ['minPrice'],
      message: 'minPrice must not be greater than maxPrice',
    },
  );

export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;

export const courseIdParams = z.object({ id: z.string().trim().min(1).max(64) });
