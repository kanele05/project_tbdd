import { AiProviderError } from './errors';

/** `chat` = AI Tutor; `general` = tóm tắt, quiz, gợi ý (dùng chung một bộ đếm). */
export type AiQuotaBucket = 'chat' | 'general';

export type AiQuotaOptions = {
  /** Số request tối đa mỗi cửa sổ, theo bucket. */
  limits: Record<AiQuotaBucket, number>;
  /** Độ dài cửa sổ (mặc định 1 giờ). */
  windowMs?: number;
  /** false -> không giới hạn (mặc định tắt khi test, bật khi chạy thật). */
  enabled?: boolean;
  /** Đồng hồ (để unit test). */
  now?: () => number;
};

type Entry = { count: number; resetAt: number };

export const AI_QUOTA_WINDOW_MS = 60 * 60 * 1000;
const PURGE_THRESHOLD = 5_000;
const noop = (): void => undefined;

/**
 * Rate limit riêng cho AI theo user (cửa sổ cố định, trong bộ nhớ) để bảo vệ hạn mức free tier của Gemini.
 * Chỉ đếm khi thật sự gọi AI (cache hit không tốn lượt). `consume` trả về hàm hoàn lượt dùng khi gọi AI lỗi.
 */
export class AiQuota {
  private readonly entries = new Map<string, Entry>();
  private limits: Record<AiQuotaBucket, number>;
  private enabled: boolean;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: AiQuotaOptions) {
    this.limits = { ...options.limits };
    this.enabled = options.enabled ?? true;
    this.windowMs = options.windowMs ?? AI_QUOTA_WINDOW_MS;
    this.now = options.now ?? Date.now;
  }

  /** Dùng trong test / cấu hình lại lúc chạy. */
  configure(options: { enabled?: boolean; limits?: Partial<Record<AiQuotaBucket, number>> }): void {
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.limits) this.limits = { ...this.limits, ...options.limits };
  }

  reset(): void {
    this.entries.clear();
  }

  /** Trừ 1 lượt. Hết lượt -> ném `AiProviderError('rate_limited')` kèm `retryAfterSec`. */
  consume(bucket: AiQuotaBucket, userId: string): () => void {
    if (!this.enabled) return noop;
    const now = this.now();
    this.purgeExpired(now);

    const key = `${bucket}:${userId}`;
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.limits[bucket]) {
      throw new AiProviderError('rate_limited', 'Per-user AI quota exceeded', {
        retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      });
    }
    entry.count += 1;
    const owned = entry;
    return () => {
      if (owned.count > 0) owned.count -= 1;
    };
  }

  private purgeExpired(now: number): void {
    if (this.entries.size < PURGE_THRESHOLD) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}
