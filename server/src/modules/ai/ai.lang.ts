import type { AiLang } from '@/lib/ai/types';

export const DEFAULT_AI_LANG: AiLang = 'en';
const SUPPORTED: readonly AiLang[] = ['vi', 'en'];

function isAiLang(value: string): value is AiLang {
  return (SUPPORTED as readonly string[]).includes(value);
}

/**
 * Chọn ngôn ngữ từ header `Accept-Language` (vd. `vi-VN,vi;q=0.9,en;q=0.8`): ngôn ngữ được hỗ trợ có
 * trọng số `q` cao nhất; ngang nhau thì tag đứng trước thắng. Không có tag hợp lệ -> `undefined`.
 */
export function parseAcceptLanguage(header: string | undefined): AiLang | undefined {
  if (!header) return undefined;
  let best: { lang: AiLang; q: number } | undefined;
  for (const part of header.split(',')) {
    const [tag, ...params] = part.trim().split(';');
    const primary = tag?.trim().toLowerCase().split('-')[0];
    if (!primary || !isAiLang(primary)) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!Number.isFinite(q) || q <= 0) continue;
    if (!best || q > best.q) best = { lang: primary, q };
  }
  return best?.lang;
}

/** Thứ tự ưu tiên: `?lang=` -> header `Accept-Language` -> `en`. */
export function resolveLang(queryLang: AiLang | undefined, acceptLanguage?: string): AiLang {
  return queryLang ?? parseAcceptLanguage(acceptLanguage) ?? DEFAULT_AI_LANG;
}
