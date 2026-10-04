import 'i18next';

import type { resources } from './resources';

/**
 * Type-safe translation keys: `t('auth:login')` / `useTranslation('auth')` are checked against the
 * English JSON files. The Vietnamese files must contain the same keys (checked by `locales.test.ts`).
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
