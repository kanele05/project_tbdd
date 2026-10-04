import { AiProviderError } from './errors';
import type { AiJsonRequest, AiJsonResult, AiProvider, AiTextRequest, AiTextResult } from './types';

export const MOCK_MODEL = 'mock-ai-1';
const WORDS_PER_CHUNK = 2;

export type MockProviderOptions = {
  /** Độ trễ giữa các đoạn khi stream (ms) để mô phỏng "gõ dần"; 0 trong test. */
  chunkDelayMs?: number;
};

/** Chia văn bản thành các đoạn ~2 từ; nối lại các đoạn luôn ra đúng văn bản gốc. */
export function splitIntoChunks(text: string): string[] {
  const words = text.match(/\s*\S+\s*/g) ?? [];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    chunks.push(words.slice(i, i + WORDS_PER_CHUNK).join(''));
  }
  return chunks;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AiProviderError('aborted', 'Request aborted');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AiProviderError('aborted', 'Request aborted'));
      },
      { once: true },
    );
  });
}

/**
 * Nhà cung cấp giả: không gọi mạng, kết quả deterministic. Nội dung do chính request cung cấp qua `mock()`
 * (module `ai` dựng từ dữ liệu khóa học thật) - nên app chạy đủ tính năng khi chưa có GEMINI_API_KEY và test ổn định.
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock' as const;
  readonly model = MOCK_MODEL;
  private readonly chunkDelayMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.chunkDelayMs = options.chunkDelayMs ?? 0;
  }

  async generateText(request: AiTextRequest): Promise<AiTextResult> {
    throwIfAborted(request.signal);
    return { text: await this.resolveText(request), model: this.model };
  }

  async *streamText(request: AiTextRequest): AsyncGenerator<string> {
    const text = await this.resolveText(request);
    for (const chunk of splitIntoChunks(text)) {
      throwIfAborted(request.signal);
      if (this.chunkDelayMs > 0) await sleep(this.chunkDelayMs, request.signal);
      yield chunk;
    }
  }

  async generateJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResult<T>> {
    throwIfAborted(request.signal);
    if (!request.mock) {
      throw new AiProviderError('unavailable', `MockProvider has no sample for "${request.label}"`);
    }
    // Kiểm tra mẫu bằng đúng schema mà provider thật phải tuân theo -> mock không bao giờ "lệch" hợp đồng.
    const parsed = request.schema.safeParse(await request.mock());
    if (!parsed.success) {
      throw new AiProviderError('bad_output', `Mock sample for "${request.label}" is invalid`);
    }
    return { data: parsed.data, model: this.model };
  }

  private async resolveText(request: AiTextRequest): Promise<string> {
    return request.mock ? request.mock() : `Demo response for "${request.label}".`;
  }
}
