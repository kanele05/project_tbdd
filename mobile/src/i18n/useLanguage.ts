import { useTranslation } from 'react-i18next';

import { usePreferencesStore } from '@/stores/preferencesStore';

import {
  isAppLanguage,
  FALLBACK_LANGUAGE,
  type AppLanguage,
  type LanguagePreference,
} from './index';

export type LanguageState = {
  /** Language currently shown (`vi` or `en`). Changing it re-renders the component. */
  language: AppLanguage;
  /** What the user picked: `system`, `vi` or `en`. */
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
};

/** Current UI language + the user's preference. Use it in Settings, or just to re-render on change. */
export function useLanguage(): LanguageState {
  const { i18n } = useTranslation();
  const preference = usePreferencesStore((state) => state.language);
  const setPreference = usePreferencesStore((state) => state.setLanguage);
  return {
    language: isAppLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE,
    preference,
    setPreference,
  };
}
