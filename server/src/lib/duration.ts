/** Thời hạn dạng `15m`, `12h`, `30d`, `900s` (khớp DURATION_PATTERN trong config/env.ts) -> mili-giây. */
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export function durationToMs(value: string): number {
  const match = /^([1-9]\d*)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration "${value}" (expected e.g. 15m, 12h, 30d)`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}

export function durationToSeconds(value: string): number {
  return Math.round(durationToMs(value) / 1000);
}
