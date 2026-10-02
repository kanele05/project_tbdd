import type { ErrorRequestHandler, Request } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { isProduction } from '@/config/env';
import { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { logger } from '@/lib/logger';

type ErrorBody = { error: { code: string; message: string; details?: unknown } };
type Mapped = { status: number; body: ErrorBody };

function build(status: number, code: string, message: string, details?: unknown): Mapped {
  const error: ErrorBody['error'] = { code, message };
  if (details !== undefined) error.details = details;
  return { status, body: { error } };
}

/** Lỗi do body-parser (JSON hỏng, body quá lớn) mang thuộc tính `type`. */
function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof err.type === 'string' &&
    err.type.startsWith('entity.') &&
    'status' in err &&
    typeof err.status === 'number'
  );
}

function mapMulter(err: MulterError): Mapped {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return build(413, 'FILE_TOO_LARGE', 'File is too large');
  }
  return build(400, 'VALIDATION_ERROR', `Invalid upload: ${err.message}`);
}

function mapPrisma(err: Prisma.PrismaClientKnownRequestError): Mapped | null {
  if (err.code === 'P2002') return build(409, 'CONFLICT', 'Resource already exists');
  if (err.code === 'P2025') return build(404, 'NOT_FOUND', 'Resource not found');
  return null;
}

function mapZod(err: ZodError): Mapped {
  const details = err.issues.map((i) => ({
    source: 'body',
    field: i.path.join('.'),
    message: i.message,
  }));
  return build(400, 'VALIDATION_ERROR', 'Invalid request data', details);
}

function mapError(err: unknown): Mapped | null {
  if (err instanceof ApiError) return build(err.status, err.code, err.message, err.details);
  if (err instanceof ZodError) return mapZod(err);
  if (err instanceof MulterError) return mapMulter(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) return mapPrisma(err);
  if (isBodyParserError(err)) {
    if (err.type === 'entity.too.large') {
      return build(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    return build(400, 'VALIDATION_ERROR', 'Malformed request body');
  }
  return null;
}

function logError(req: Request, err: unknown, status: number): void {
  const log = req.log ?? logger;
  // Lỗi 5xx: log đầy đủ stack ở server; lỗi 4xx chỉ là cảnh báo nghiệp vụ.
  if (status >= 500) log.error({ err }, 'Unhandled error');
  else log.debug({ err }, 'Request rejected');
}

/**
 * Xử lý lỗi tập trung (CLAUDE.md §8): `{ error: { code, message, details? } }`.
 * Không bao giờ trả stack trace; lỗi lạ trả 500 `INTERNAL_ERROR` (production ẩn cả message gốc).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const mapped = mapError(err);
  if (mapped) {
    logError(req, err, mapped.status);
    res.status(mapped.status).json(mapped.body);
    return;
  }
  logError(req, err, 500);
  const message =
    !isProduction && err instanceof Error && err.message ? err.message : 'Internal server error';
  const fallback = build(500, 'INTERNAL_ERROR', message);
  res.status(fallback.status).json(fallback.body);
};
