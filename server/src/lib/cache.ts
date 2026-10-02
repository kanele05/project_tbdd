import { LRUCache } from 'lru-cache';

import { isTest } from '@/config/env';

export type TtlCacheOptions = {
  /** Số phần tử tối đa (LRU). */
  max?: number;
  /** TTL mặc định (ms). */
  defaultTtlMs?: number;
  /** false -> `wrap` luôn gọi lại hàm nguồn (dùng cho test). */
  enabled?: boolean;
};

/**
 * Cache trong bộ nhớ có TTL (lru-cache). Dùng cho dữ liệu đọc nhiều, ít đổi
 * (categories, tags hot, home...). Khóa quy ước `<nhóm>:<chi tiết>`, vd `categories`, `home:popular`.
 */
export class TtlCache {
  private readonly store: LRUCache<string, { value: unknown }>;
  private readonly enabled: boolean;

  constructor(options: TtlCacheOptions = {}) {
    const { max = 500, defaultTtlMs = 60_000, enabled = true } = options;
    this.enabled = enabled;
    this.store = new LRUCache<string, { value: unknown }>({
      max,
      ttl: defaultTtlMs,
    });
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.store.get(key)?.value as T | undefined;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (!this.enabled) return;
    this.store.set(key, { value }, ttlMs === undefined ? undefined : { ttl: ttlMs });
  }

  has(key: string): boolean {
    return this.enabled && this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Xóa mọi khóa bắt đầu bằng `prefix` (vd `invalidatePrefix('courses:')`). Trả về số khóa đã xóa. */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count += 1;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  /** Lấy từ cache, nếu chưa có thì gọi `loader` rồi lưu (kể cả kết quả `null`). */
  async wrap<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    if (this.enabled) {
      const hit = this.store.get(key);
      if (hit) return hit.value as T;
    }
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }
}

/** Singleton dùng chung. Tắt trong test để dữ liệu test không bị "dính" cache. */
export const cache = new TtlCache({ enabled: !isTest });
