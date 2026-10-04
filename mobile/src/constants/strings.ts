import { hasTranslation, tr } from '@/i18n';

/**
 * LEGACY facade over the i18n catalogue. The strings now live in `src/i18n/locales/<lang>/*.json`.
 *
 * @deprecated Kept only so screens that have not been migrated yet still compile and show the
 * right language when they (re)mount. Each property reads the current language when accessed, but
 * the component will NOT re-render on a language change by itself: migrate it to
 * `const { t } = useTranslation('<ns>')` and delete the import (CLAUDE.md §6-§7).
 */

type KeyMap = { readonly [key: string]: string | KeyMap };
type Lazy<T> = T extends string ? string : { readonly [K in keyof T]: Lazy<T[K]> };

/** Turn `{ a: { b: 'ns:key' } }` into an object whose leaves translate on every read. */
function lazyStrings<T extends KeyMap>(map: T): Lazy<T> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(map)) {
    if (typeof value === 'string') {
      Object.defineProperty(result, name, { enumerable: true, get: () => tr(value) });
    } else {
      result[name] = lazyStrings(value);
    }
  }
  return result as Lazy<T>;
}

export const STRINGS = lazyStrings({
  appName: 'common:appName',

  tabs: {
    home: 'common:tabs.home',
    search: 'common:tabs.search',
    myCourses: 'common:tabs.myCourses',
    profile: 'common:tabs.profile',
  },

  common: {
    retry: 'common:actions.retry',
    cancel: 'common:actions.cancel',
    confirm: 'common:actions.confirm',
    save: 'common:actions.save',
    done: 'common:actions.done',
    close: 'common:actions.close',
    back: 'common:actions.back',
    viewMore: 'common:actions.viewMore',
    viewAll: 'common:actions.viewAll',
    seeMore: 'common:actions.seeMore',
    seeLess: 'common:actions.seeLess',
    loading: 'common:loading',
    lessons: 'common:lessons.noun_other',
    free: 'common:free',
    exploreCourses: 'common:actions.exploreCourses',
    bookmark: 'common:bookmark.save',
    removeBookmark: 'common:bookmark.remove',
  },

  errors: {
    generic: 'errors:generic',
    network: 'errors:network',
    timeout: 'errors:timeout',
    offline: 'errors:offline',
    sessionExpired: 'errors:sessionExpired',
    boundaryTitle: 'errors:boundaryTitle',
    boundaryMessage: 'errors:boundaryMessage',
    loadFailedTitle: 'errors:loadFailedTitle',
  },

  empty: {
    defaultTitle: 'common:empty.defaultTitle',
  },

  auth: {
    welcomeBack: 'auth:welcomeBack',
    loginSubtitle: 'auth:loginSubtitle',
    login: 'auth:login',
    register: 'auth:register',
    createAccountTitle: 'auth:createAccountTitle',
    createAccountSubtitle: 'auth:createAccountSubtitle',
    noAccount: 'auth:noAccount',
    signUp: 'auth:signUp',
    haveAccount: 'auth:haveAccount',
    logout: 'auth:logout',
    fullName: 'auth:fullName',
    email: 'auth:email',
    password: 'auth:password',
    confirmPassword: 'auth:confirmPassword',
    showPassword: 'common:a11y.showPassword',
    hidePassword: 'common:a11y.hidePassword',
  },

  offline: {
    banner: 'common:offline.banner',
  },
});

/**
 * LEGACY: user-facing message per server error code (PLAN.md §9.4). Reads the translation of
 * `errors:codes.<CODE>` on access; unknown codes give `undefined`.
 *
 * @deprecated Use `getErrorMessage(error)` / `getErrorMessageForCode(code)` from `@/lib/appError`.
 */
export const ERROR_MESSAGES: Record<string, string> = new Proxy<Record<string, string>>(
  {},
  {
    get: (_target, code) => {
      if (typeof code !== 'string') return undefined;
      const key = `errors:codes.${code}`;
      return hasTranslation(key) ? tr(key) : undefined;
    },
  },
);
