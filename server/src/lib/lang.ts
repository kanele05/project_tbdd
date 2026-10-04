/** Ngôn ngữ của email / thông báo bảo mật (khớp i18n của app: vi + en). */
export type Lang = 'vi' | 'en';

function isLang(value: string): value is Lang {
  return value === 'vi' || value === 'en';
}

type Candidate = { primary: string; q: number; index: number };

function parseAcceptLanguage(header: string): Candidate[] {
  return header
    .split(',')
    .map((part, index): Candidate => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.map((p) => /^\s*q=([\d.]+)\s*$/.exec(p)?.[1]).find(Boolean);
      return {
        primary: (tag.split('-')[0] ?? '').toLowerCase(),
        q: qParam === undefined ? 1 : Number(qParam),
        index,
      };
    })
    .filter((c) => c.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
}

/**
 * Chọn ngôn ngữ: field `lang` của client (nếu hợp lệ) > header `Accept-Language` (tag có q cao nhất
 * mà ta hỗ trợ, so khớp theo ngôn ngữ chính: `vi-VN` -> `vi`) > `en`.
 */
export function resolveLang(preferred?: string | null, acceptLanguage?: string | null): Lang {
  if (preferred && isLang(preferred)) return preferred;
  if (!acceptLanguage) return 'en';
  const match = parseAcceptLanguage(acceptLanguage).find((c) => isLang(c.primary));
  return match && isLang(match.primary) ? match.primary : 'en';
}
