import { env, isProduction, isTest } from '@/config/env';
import { logger } from '@/lib/logger';

import { GeminiProvider } from './gemini.provider';
import { withMetrics } from './instrumented';
import { MockProvider } from './mock.provider';
import { AiQuota, type AiQuotaBucket } from './quota';
import type { AiProvider, AiProviderName } from './types';

/** Mock stream "gõ dần" khi chạy thật (để thấy SSE chạy), không trễ khi test. */
const MOCK_CHUNK_DELAY_MS = 35;

/**
 * Chọn provider theo env: `AI_PROVIDER` nếu có; ngược lại có `GEMINI_API_KEY` -> gemini, không có -> mock.
 * `AI_PROVIDER=gemini` mà thiếu key -> provider vẫn tạo được nhưng mọi lệnh gọi trả 503 `AI_UNAVAILABLE`.
 */
export function resolveProviderName(): AiProviderName {
  return env.AI_PROVIDER ?? (env.GEMINI_API_KEY ? 'gemini' : 'mock');
}

export function createAiProvider(): AiProvider {
  const name = resolveProviderName();
  if (name === 'gemini') {
    if (!env.GEMINI_API_KEY) logger.warn('AI_PROVIDER=gemini but GEMINI_API_KEY is empty');
    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS,
    });
  }
  if (isProduction)
    logger.warn('AI is running in mock mode (no GEMINI_API_KEY): demo content only');
  return new MockProvider({ chunkDelayMs: isTest ? 0 : MOCK_CHUNK_DELAY_MS });
}

let provider: AiProvider | undefined;

/** Provider dùng chung của server (tạo khi dùng lần đầu), có đo Prometheus (`ai_requests_total`...). */
export function getAiProvider(): AiProvider {
  if (!provider) {
    provider = withMetrics(createAiProvider());
    logger.info({ ai: { provider: provider.name, model: provider.model } }, 'AI provider ready');
  }
  return provider;
}

/** Chỉ dùng trong test: thay provider (vd. provider giả luôn lỗi); truyền `undefined` để về mặc định. */
export function setAiProviderForTests(next: AiProvider | undefined): void {
  provider = next;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Khóa bộ đếm dùng chung cho toàn server (không trùng id user dạng cuid). */
const GLOBAL_QUOTA_KEY = 'global';

/** Rate limit AI theo user mỗi GIỜ (chat riêng, tính năng khác dùng chung); tắt khi NODE_ENV=test. */
export const aiQuota = new AiQuota({
  limits: { chat: env.AI_CHAT_LIMIT_PER_HOUR, general: env.AI_LIMIT_PER_HOUR },
  enabled: !isTest,
});

/** Trần mỗi NGÀY theo user: mọi tính năng AI cộng dồn vào một bộ đếm (luôn dùng bucket `general`). */
export const aiUserDailyQuota = new AiQuota({
  limits: { chat: env.AI_USER_LIMIT_PER_DAY, general: env.AI_USER_LIMIT_PER_DAY },
  windowMs: DAY_MS,
  enabled: !isTest,
});

/**
 * Trần mỗi NGÀY cho cả server: hạn mức free tier của Gemini tính theo PROJECT (không theo user) nên chặn sớm
 * ở đây để người dùng nhận 429 `AI_RATE_LIMITED` rõ ràng thay vì lỗi từ Google. Mock không tốn hạn mức -> tắt.
 */
export const aiGlobalQuota = new AiQuota({
  limits: { chat: env.AI_GLOBAL_LIMIT_PER_DAY, general: env.AI_GLOBAL_LIMIT_PER_DAY },
  windowMs: DAY_MS,
  enabled: !isTest && resolveProviderName() === 'gemini',
});

/**
 * Trừ 1 lượt ở cả 3 tầng (giờ/user -> ngày/user -> ngày/server). Hết lượt ở tầng nào cũng ném
 * `AiProviderError('rate_limited')` và hoàn lại các tầng đã trừ. Trả về hàm hoàn lượt (dùng khi gọi AI lỗi).
 */
export function consumeAiBudget(bucket: AiQuotaBucket, userId: string): () => void {
  const refunds: (() => void)[] = [];
  const refundAll = (): void => {
    for (const refund of refunds) refund();
  };
  try {
    refunds.push(aiQuota.consume(bucket, userId));
    refunds.push(aiUserDailyQuota.consume('general', userId));
    refunds.push(aiGlobalQuota.consume('general', GLOBAL_QUOTA_KEY));
  } catch (err) {
    refundAll();
    throw err;
  }
  return refundAll;
}

export { AiProviderError, describeAnyError, rethrowAsApiError, toApiError } from './errors';
export type { AiLang, AiProvider, AiProviderName } from './types';
