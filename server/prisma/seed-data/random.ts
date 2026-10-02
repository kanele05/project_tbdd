/**
 * PRNG có seed (mulberry32) - seed luôn sinh ra cùng một bộ dữ liệu ở mọi lần chạy.
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Số thực trong [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Số nguyên trong [min, max] (gồm cả hai đầu). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty list');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Lấy `count` phần tử khác nhau (Fisher-Yates một phần). */
  sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items];
    const n = Math.min(count, copy.length);
    for (let i = 0; i < n; i += 1) {
      const j = i + Math.floor(this.next() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy.slice(0, n);
  }

  /** Chọn theo trọng số: `weighted([['a', 1], ['b', 3]])`. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[entries.length - 1]?.[0] as T;
  }
}
