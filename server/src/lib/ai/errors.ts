import { ApiError } from '@/lib/ApiError';

export type AiFailureKind =
  | 'rate_limited' // hết hạn mức (Gemini 429 hoặc rate limit của server)
  | 'blocked' // bị bộ lọc an toàn chặn
  | 'unavailable' // thiếu key, sai key/model, 5xx, lỗi mạng
  | 'timeout' // quá thời gian chờ
  | 'bad_output' // model trả rỗng / JSON sai schema
  | 'aborted'; // client ngắt kết nối (không phải lỗi - không trả response)

/** Lỗi nội bộ của lớp AI; service chuyển thành `ApiError` (429 / 422 / 503) bằng `toApiError`. */
export class AiProviderError extends Error {
  readonly retryAfterSec?: number;

  constructor(
    public readonly kind: AiFailureKind,
    message: string,
    options: { retryAfterSec?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AiProviderError';
    this.retryAfterSec = options.retryAfterSec;
  }
}

export type AiErrorInfo = { status: number; code: string; message: string; details?: unknown };

/** Mã + thông điệp trả cho client (không lộ chi tiết nội bộ: key, tên model, stack...). */
export function describeAiError(err: AiProviderError): AiErrorInfo {
  switch (err.kind) {
    case 'rate_limited':
      return {
        status: 429,
        code: 'AI_RATE_LIMITED',
        message: 'The AI assistant is receiving too many requests. Please try again later.',
        details: err.retryAfterSec === undefined ? undefined : { retryAfterSec: err.retryAfterSec },
      };
    case 'blocked':
      return {
        status: 422,
        code: 'AI_BLOCKED',
        message: 'The AI cannot answer this request because it was blocked by safety filters.',
      };
    default:
      return {
        status: 503,
        code: 'AI_UNAVAILABLE',
        message: 'The AI assistant is temporarily unavailable. Please try again later.',
      };
  }
}

/** `AiProviderError` -> `ApiError` (429 `AI_RATE_LIMITED` / 422 `AI_BLOCKED` / 503 `AI_UNAVAILABLE`). */
export function toApiError(err: AiProviderError): ApiError {
  const info = describeAiError(err);
  return new ApiError(info.status, info.code, info.message, info.details);
}

/** Lỗi bất kỳ -> thông tin gửi qua sự kiện SSE `error` (lỗi lạ = 500 `INTERNAL_ERROR`, không lộ chi tiết). */
export function describeAnyError(err: unknown): AiErrorInfo {
  if (err instanceof AiProviderError) return describeAiError(err);
  if (err instanceof ApiError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

/** Dùng trong `catch`: ném lại `ApiError` nếu là lỗi AI, các lỗi khác giữ nguyên để errorHandler xử lý. */
export function rethrowAsApiError(err: unknown): never {
  if (err instanceof AiProviderError) throw toApiError(err);
  throw err;
}
