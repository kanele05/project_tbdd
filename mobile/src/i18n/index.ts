import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources';

export { Trans, useTranslation } from 'react-i18next';
export { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources';
export type { Namespace } from './resources';

/** Languages the app is translated into. */
export const APP_LANGUAGES = ['vi', 'en'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** What the user picks in Settings: follow the device, or force one language. */
export type LanguagePreference = 'system' | AppLanguage;

export const FALLBACK_LANGUAGE: AppLanguage = 'en';

/** BCP-47 tag used for `Intl` / date formatting per language. */
const LOCALE_TAGS: Record<AppLanguage, string> = { vi: 'vi-VN', en: 'en-US' };

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || isAppLanguage(value);
}

/** Device language limited to the supported ones: a Vietnamese device => `vi`, everything else => `en`. */
export function getDeviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'vi' ? 'vi' : FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === 'system' ? getDeviceLanguage() : preference;
}

/** The app's single i18next instance (`useTranslation` finds it through `initReactI18next`). */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: [...APP_LANGUAGES],
  ns: [...NAMESPACES],
  defaultNS: DEFAULT_NAMESPACE,
  // Bundled resources => initialisation is synchronous; `t` works right after this module loads.
  initAsync: false,
  // React already escapes rendered text; escaping here would turn "O'Brien" into "O&#39;Brien".
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

/** Web: keep `<html lang>` in step with the UI language (screen readers, hyphenation, translators). */
function syncDocumentLanguage(language: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

dayjs.locale(i18n.language);
syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', (language) => {
  dayjs.locale(language);
  syncDocumentLanguage(language);
});

export { i18n };

/** The language currently shown (always one of `APP_LANGUAGES`). */
export function getCurrentLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
}

/** `vi-VN` / `en-US` for the current language - feed it to `Intl.*` and dayjs. */
export function getLocaleTag(): string {
  return LOCALE_TAGS[getCurrentLanguage()];
}

/** Switch the UI language (no persistence - see `preferencesStore.setLanguage`). */
export async function applyLanguage(language: AppLanguage): Promise<void> {
  if (i18n.language === language) return;
  await i18n.changeLanguage(language);
}

type TranslateOptions = Record<string, unknown>;

/**
 * Translate a key that is only known at runtime (e.g. an error `code` from the server). Prefer the
 * typed `t` from `useTranslation('<ns>')` for literal keys.
 */
export function tr(key: string, options?: TranslateOptions): string {
  const translate = i18n.t as unknown as (k: string, o?: TranslateOptions) => string;
  return translate(key, options);
}

/** Whether a (runtime) key exists in the current language or its fallback. */
export function hasTranslation(key: string): boolean {
  return i18n.exists(key);
}
