import type { ZodType } from 'zod';

/** Ngôn ngữ AI trả lời (query `lang` hoặc header `Accept-Language`, mặc định `en`). */
export type AiLang = 'vi' | 'en';

export type AiProviderName = 'gemini' | 'mock';

/** Một lượt hội thoại trước đó (cũ -> mới). */
export type AiMessage = { role: 'user' | 'assistant'; text: string };

export type AiUsage = { promptTokens?: number; outputTokens?: number; totalTokens?: number };

type AiRequestBase = {
  /** Nhãn tác vụ để log (vd `course_summary`) - KHÔNG chứa dữ liệu người dùng. */
  label: string;
  /** System instruction: vai trò + luật (nội dung khóa học đặt trong đây, bọc thẻ dữ liệu). */
  system?: string;
  /** Lịch sử hội thoại trước `prompt` (chat). */
  history?: readonly AiMessage[];
  prompt: string;
  /** Hủy request (client ngắt kết nối). */
  signal?: AbortSignal;
};

export type AiTextRequest = AiRequestBase & {
  /** Nội dung mẫu cho MockProvider; provider thật bỏ qua (chỉ gọi khi dùng mock). */
  mock?: () => string | Promise<string>;
};

export type AiJsonRequest<T> = AiRequestBase & {
  /** Schema zod: dùng để (1) sinh JSON schema gửi cho model, (2) kiểm tra kết quả trả về. */
  schema: ZodType<T>;
  /** Dữ liệu mẫu cho MockProvider; provider thật bỏ qua (chỉ gọi khi dùng mock). */
  mock?: () => T | Promise<T>;
};

export type AiTextResult = { text: string; model: string; usage?: AiUsage };
export type AiJsonResult<T> = { data: T; model: string; usage?: AiUsage };

/** Lớp trừu tượng nhà cung cấp AI: đổi Gemini <-> mock (hoặc nhà khác) mà không sửa module nghiệp vụ. */
export interface AiProvider {
  readonly name: AiProviderName;
  readonly model: string;
  generateText(request: AiTextRequest): Promise<AiTextResult>;
  /** Trả về các đoạn chữ theo thứ tự. Lỗi (kể cả lỗi mở stream) được ném khi `next()` đầu tiên chạy. */
  streamText(request: AiTextRequest): AsyncIterable<string>;
  generateJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResult<T>>;
}
