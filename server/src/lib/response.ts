import type { Response } from 'express';

/** Response thành công: `{ data, meta? }` (CLAUDE.md §8). */
export type ApiSuccess<T, M = Record<string, unknown>> = { data: T; meta?: M };

/** 200 OK: `ok(res, data)` hoặc `ok(res, list, paginationMeta)`. */
export function ok<T>(res: Response, data: T, meta?: object): Response {
  const body: ApiSuccess<T, object> = meta === undefined ? { data } : { data, meta };
  return res.status(200).json(body);
}

/** 201 Created. */
export function created<T>(res: Response, data: T, meta?: object): Response {
  const body: ApiSuccess<T, object> = meta === undefined ? { data } : { data, meta };
  return res.status(201).json(body);
}

/** 204 No Content (không có body). */
export function noContent(res: Response): Response {
  return res.status(204).send();
}
