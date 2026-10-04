import { getLocaleTag } from './index';

/**
 * Locale-aware number / date formatting following the UI language. They read the current language
 * when called, so a component that shows their output must re-render on language change (call
 * `useTranslation()` or `useLanguage()` in it).
 */

function safeNumberFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat | null {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return null;
  }
}

/** 1233 -> "1,233" (en) / "1.233" (vi). Falls back to `String(value)` if `Intl` is unavailable. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '0';
  const formatter = safeNumberFormat(getLocaleTag(), options);
  return formatter ? formatter.format(value) : String(value);
}

/** Fixed number of fraction digits: (73.75, 2) -> "73.75" (en) / "73,75" (vi). */
export function formatFixed(value: number, fractionDigits: number): string {
  return formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type DateInput = string | number | Date;

/** Medium date: "Oct 20, 2026" (en) / "20 thg 10, 2026" (vi). Empty string for an invalid date. */
export function formatDate(input: DateInput, options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(
      getLocaleTag(),
      options ?? { year: 'numeric', month: 'short', day: 'numeric' },
    ).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
