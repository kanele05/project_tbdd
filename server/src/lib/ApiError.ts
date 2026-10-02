import { ERROR_STATUS, type ErrorCode } from '@/lib/errorCodes';

/**
 * Lỗi nghiệp vụ có kiểm soát. `errorHandler` chuyển thành
 * `{ error: { code, message, details? } }` (CLAUDE.md §8).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Tạo lỗi từ mã trong bảng ERROR_STATUS (status tự suy ra): ApiError.of('NOT_ENROLLED', 'Enroll first'). */
  static of(code: ErrorCode, message: string, details?: unknown): ApiError {
    return new ApiError(ERROR_STATUS[code], code, message, details);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'You do not have permission'): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found'): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(code: string, message: string): ApiError {
    return new ApiError(409, code, message);
  }

  /** 422 - vi phạm quy tắc nghiệp vụ (vd. CART_EMPTY, FREE_COURSE). */
  static unprocessable(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(422, code, message, details);
  }
}
