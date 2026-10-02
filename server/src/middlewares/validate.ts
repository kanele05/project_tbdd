import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { ApiError } from '@/lib/ApiError';

type Source = 'body' | 'query' | 'params';

export type ValidationSchemas = Partial<Record<Source, ZodType>>;

export type ValidationDetail = { source: Source; field: string; message: string };

const SOURCES: Source[] = ['params', 'query', 'body'];

/**
 * Validate body / query / params bằng zod (CLAUDE.md §8). Dữ liệu đã parse (đã trim, coerce, default)
 * được ghi đè lại vào `req`, controller chỉ cần ép kiểu: `req.body as RegisterInput`.
 * Lỗi -> 400 `VALIDATION_ERROR`, `details = [{ source, field, message }]`.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ValidationDetail[] = [];
    const parsed: Partial<Record<Source, unknown>> = {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (result.success) {
        parsed[source] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ source, field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', details));
      return;
    }

    if ('params' in parsed) req.params = parsed.params as typeof req.params;
    if ('body' in parsed) req.body = parsed.body;
    // Express 5: `req.query` là getter chỉ đọc -> phải định nghĩa lại thuộc tính trên chính request.
    if ('query' in parsed) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
