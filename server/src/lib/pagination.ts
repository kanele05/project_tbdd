import { z } from 'zod';

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

/** Zod dùng chung cho `?page=1&limit=20` (limit tối đa 50). Module khác có thể `.extend({...})`. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Pagination = PaginationQuery & {
  /** Dùng cho Prisma `skip`. */
  skip: number;
  /** Dùng cho Prisma `take`. */
  take: number;
};

/**
 * Chuyển `page`/`limit` (đã qua `validate`, hoặc thô từ `req.query`) thành `skip`/`take`.
 * Giá trị sai / thiếu rơi về mặc định, `limit` bị kẹp trong [1, 50].
 */
export function getPagination(query: { page?: unknown; limit?: unknown } = {}): Pagination {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const rawLimit = Math.floor(Number(query.limit)) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** `totalPages = ceil(total / limit)`, 0 nếu `total = 0`. */
export function buildPaginationMeta(
  total: number,
  pagination: { page: number; limit: number },
): PaginationMeta {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
  };
}
