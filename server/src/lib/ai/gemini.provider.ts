import {
  type GenerateContentConfig,
  type GenerateContentParameters,
  type GenerateContentResponse,
  GoogleGenAI,
} from '@google/genai';

import { logger } from '@/lib/logger';

import { AiProviderError } from './errors';
import { parseModelJson, toGeminiJsonSchema } from './json';
import type {
  AiJsonRequest,
  AiJsonResult,
  AiMessage,
  AiProvider,
  AiTextRequest,
  AiTextResult,
  AiUsage,
} from './types';

/** Phần của `GoogleGenAI` mà provider dùng - cho phép test thay bằng client giả (không gọi mạng). */
export type GeminiClient = {
  models: Pick<GoogleGenAI['models'], 'generateContent' | 'generateContentStream'>;
};

export type GeminiProviderOptions = {
  /** Không có key -> mọi lệnh gọi ném `AiProviderError('unavailable')` (503 `AI_UNAVAILABLE`). */
  apiKey?: string;
  model: string;
  /**
   * Model dự phòng: model chính quá tải / treo / hết hạn mức (unavailable, timeout, rate_limited) thì thử
   * model này. Khi có dự phòng, mỗi model được một nửa `timeoutMs` để tổng thời gian chờ không đổi.
   */
  fallbackModel?: string;
  /** Tổng thời gian tối đa cho một lệnh gọi (kể cả toàn bộ stream). */
  timeoutMs: number;
  client?: GeminiClient;
};

/** Phần của response mà provider đọc (khớp `GenerateContentResponse`, dễ dựng giả trong test). */
export type GeminiResponseLike = Pick<
  GenerateContentResponse,
  'candidates' | 'promptFeedback' | 'usageMetadata' | 'text'
>;

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

/** Lý do dừng nghĩa là nội dung bị chặn / giữ lại (xem FinishReason & BlockedReason của SDK). */
const BLOCKING_FINISH_REASONS = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
]);

/** Số lần thử tối đa khi output JSON sai schema (mỗi lần thử tốn 1 request trong hạn mức free tier). */
const MAX_JSON_ATTEMPTS = 2;

/** Lỗi phía model (không phải lỗi nội dung hay người dùng hủy) -> đáng thử model dự phòng. */
const FALLBACK_KINDS = new Set(['unavailable', 'timeout', 'rate_limited']);

export function shouldUseFallback(err: unknown): boolean {
  return err instanceof AiProviderError && FALLBACK_KINDS.has(err.kind);
}

/**
 * Ghép lịch sử + câu hỏi hiện tại thành `contents` của Gemini: vai trò assistant -> `model`,
 * gộp các lượt liên tiếp cùng vai trò, và luôn bắt đầu bằng lượt `user`.
 */
export function buildContents(history: readonly AiMessage[], prompt: string): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const push = (role: GeminiContent['role'], text: string): void => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  };
  for (const message of history) {
    if (!message.text.trim()) continue;
    const role = message.role === 'assistant' ? 'model' : 'user';
    if (role === 'model' && contents.length === 0) continue; // hội thoại phải mở đầu bằng user
    push(role, message.text);
  }
  push('user', prompt);
  return contents;
}

export function readUsage(response: GeminiResponseLike): AiUsage | undefined {
  const meta = response.usageMetadata;
  if (!meta) return undefined;
  return {
    promptTokens: meta.promptTokenCount,
    outputTokens: meta.candidatesTokenCount,
    totalTokens: meta.totalTokenCount,
  };
}

/** Prompt bị chặn hoặc câu trả lời bị cắt vì an toàn -> `AiProviderError('blocked')` (422 `AI_BLOCKED`). */
export function assertNotBlocked(response: GeminiResponseLike): void {
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason && String(blockReason) !== 'BLOCKED_REASON_UNSPECIFIED') {
    throw new AiProviderError('blocked', `Prompt was blocked (${String(blockReason)})`);
  }
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && BLOCKING_FINISH_REASONS.has(String(finishReason))) {
    throw new AiProviderError('blocked', `Response was blocked (${String(finishReason)})`);
  }
}

export type RunState = { timedOut: boolean; userAborted: boolean };

/**
 * Lỗi SDK/mạng -> `AiProviderError`. SDK ném `ApiError` có `status` (HTTP): 429 = hết hạn mức free tier;
 * 400/401/403/404 = sai key / model / vùng không hỗ trợ (cấu hình, không phải lỗi của người dùng); 5xx = Google lỗi.
 */
export function mapGeminiError(err: unknown, state: RunState): AiProviderError {
  if (err instanceof AiProviderError) return err;
  if (state.userAborted) return new AiProviderError('aborted', 'Request aborted', { cause: err });
  if (state.timedOut) return new AiProviderError('timeout', 'AI request timed out', { cause: err });
  const status =
    typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
  if (status === 429) {
    return new AiProviderError('rate_limited', 'Gemini quota exceeded (HTTP 429)', { cause: err });
  }
  const suffix = typeof status === 'number' ? ` (HTTP ${status})` : '';
  return new AiProviderError('unavailable', `Gemini request failed${suffix}`, { cause: err });
}

type Run = {
  signal: AbortSignal;
  state: () => RunState;
  /** Hủy request đang bay (dọn dẹp khi stream kết thúc sớm). */
  cancel: () => void;
  startedAt: number;
};

function startRun(timeoutMs: number, userSignal?: AbortSignal): Run {
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(timeoutMs);
  const signals = [controller.signal, timeout, ...(userSignal ? [userSignal] : [])];
  return {
    signal: AbortSignal.any(signals),
    state: () => ({ timedOut: timeout.aborted, userAborted: userSignal?.aborted === true }),
    cancel: () => controller.abort(),
    startedAt: Date.now(),
  };
}

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  readonly model: string;
  private client: GeminiClient | undefined;

  constructor(private readonly options: GeminiProviderOptions) {
    this.model = options.model;
    this.client = options.client;
  }

  async generateText(request: AiTextRequest): Promise<AiTextResult> {
    const { text, usage, model } = await this.generate(request);
    return { text, model, usage };
  }

  async generateJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResult<T>> {
    const config: GenerateContentConfig = {
      responseMimeType: 'application/json',
      responseJsonSchema: toGeminiJsonSchema(request.schema),
    };
    let lastError: AiProviderError | undefined;
    for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt += 1) {
      try {
        const { text, usage, model } = await this.generate(request, config);
        return { data: parseModelJson(text, request.schema), model, usage };
      } catch (err) {
        if (!(err instanceof AiProviderError) || err.kind !== 'bad_output') throw err;
        lastError = err;
        logger.warn({ ai: { provider: 'gemini', label: request.label, attempt } }, 'AI bad output');
      }
    }
    throw lastError ?? new AiProviderError('bad_output', 'Model output is invalid');
  }

  /** Model chính rồi model dự phòng (nếu có), kèm thời gian chờ cho mỗi model. */
  private attempts(): { models: string[]; timeoutMs: number } {
    const { fallbackModel, timeoutMs } = this.options;
    if (!fallbackModel || fallbackModel === this.model) return { models: [this.model], timeoutMs };
    return { models: [this.model, fallbackModel], timeoutMs: Math.ceil(timeoutMs / 2) };
  }

  async *streamText(request: AiTextRequest): AsyncGenerator<string> {
    const { models, timeoutMs } = this.attempts();
    for (const [index, model] of models.entries()) {
      const progress = { emitted: 0 };
      try {
        yield* this.streamWith(model, timeoutMs, request, progress);
        return;
      } catch (err) {
        // Đã gửi chữ cho người dùng thì không đổi model giữa chừng.
        const isLast = index === models.length - 1;
        if (isLast || progress.emitted > 0 || !shouldUseFallback(err)) throw err;
      }
    }
  }

  private async *streamWith(
    model: string,
    timeoutMs: number,
    request: AiTextRequest,
    progress: { emitted: number },
  ): AsyncGenerator<string> {
    const run = startRun(timeoutMs, request.signal);
    let usage: AiUsage | undefined;
    let failure: AiProviderError | undefined;
    let isComplete = false;
    try {
      const stream = await this.requireClient().models.generateContentStream(
        this.params(model, request, run.signal),
      );
      for await (const chunk of stream) {
        assertNotBlocked(chunk);
        usage = readUsage(chunk) ?? usage;
        const text = chunk.text;
        if (text) {
          progress.emitted += text.length;
          yield text;
        }
      }
      if (progress.emitted === 0)
        throw new AiProviderError('bad_output', 'Empty response from model');
      isComplete = true;
    } catch (err) {
      failure = mapGeminiError(err, run.state());
      throw failure;
    } finally {
      run.cancel();
      this.log(model, request.label, 'stream', run, usage, {
        outcome: isComplete ? 'ok' : (failure?.kind ?? 'cancelled'),
        reason: failure?.message,
      });
    }
  }

  private async generate(
    request: AiTextRequest | AiJsonRequest<unknown>,
    config: GenerateContentConfig = {},
  ): Promise<{ text: string; usage?: AiUsage; model: string }> {
    const { models, timeoutMs } = this.attempts();
    let lastError: unknown;
    for (const model of models) {
      try {
        return { ...(await this.generateWith(model, timeoutMs, request, config)), model };
      } catch (err) {
        if (!shouldUseFallback(err)) throw err;
        lastError = err;
      }
    }
    throw lastError;
  }

  private async generateWith(
    model: string,
    timeoutMs: number,
    request: AiTextRequest | AiJsonRequest<unknown>,
    config: GenerateContentConfig,
  ): Promise<{ text: string; usage?: AiUsage }> {
    const run = startRun(timeoutMs, request.signal);
    let usage: AiUsage | undefined;
    let outcome = 'ok';
    let reason: string | undefined;
    try {
      const response = await this.requireClient().models.generateContent(
        this.params(model, request, run.signal, config),
      );
      usage = readUsage(response);
      assertNotBlocked(response);
      const text = response.text ?? '';
      if (!text.trim()) throw new AiProviderError('bad_output', 'Empty response from model');
      return { text, usage };
    } catch (err) {
      const mapped = mapGeminiError(err, run.state());
      outcome = mapped.kind;
      reason = mapped.message;
      throw mapped;
    } finally {
      run.cancel();
      this.log(model, request.label, 'generate', run, usage, { outcome, reason });
    }
  }

  private params(
    model: string,
    request: AiTextRequest | AiJsonRequest<unknown>,
    signal: AbortSignal,
    extra: GenerateContentConfig = {},
  ): GenerateContentParameters {
    return {
      model,
      contents: buildContents(request.history ?? [], request.prompt),
      config: {
        ...(request.system ? { systemInstruction: request.system } : {}),
        abortSignal: signal,
        ...extra,
      },
    };
  }

  private requireClient(): GeminiClient {
    if (this.client) return this.client;
    if (!this.options.apiKey) {
      throw new AiProviderError('unavailable', 'GEMINI_API_KEY is not configured');
    }
    this.client = new GoogleGenAI({
      apiKey: this.options.apiKey,
      // Thử lại 1 lần cho lỗi 503 (model quá tải). KHÔNG thử lại 429 để không đốt thêm hạn mức free tier.
      httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, httpStatusCodes: [503] } },
    });
    return this.client;
  }

  /**
   * Log thời gian + token; tuyệt đối không log nội dung prompt/câu trả lời hay API key.
   * `reason` = message của `AiProviderError` (vd "Gemini request failed (HTTP 503)") - không chứa nội dung người dùng.
   */
  private log(
    model: string,
    label: string,
    op: 'generate' | 'stream',
    run: Run,
    usage: AiUsage | undefined,
    { outcome, reason }: { outcome: string; reason?: string },
  ): void {
    const ai = {
      provider: 'gemini',
      model,
      label,
      op,
      outcome,
      durationMs: Date.now() - run.startedAt,
      promptTokens: usage?.promptTokens,
      outputTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
    };
    if (outcome === 'ok') logger.info({ ai }, 'AI request');
    else logger.warn({ ai: { ...ai, reason } }, 'AI request did not complete');
  }
}
