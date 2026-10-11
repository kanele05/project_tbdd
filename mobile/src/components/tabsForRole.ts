import type { FeatherIconName } from '@/components/ui/icons';
import type { Role } from '@/types/api';

/** Key of the label in the `common:tabs` namespace. */
export type TabTitleKey = 'home' | 'search' | 'myCourses' | 'profile' | 'studio' | 'admin';

export type TabConfig = {
  /** Route file name inside `app/(tabs)/`. */
  name: string;
  titleKey: TabTitleKey;
  icon: FeatherIconName;
};

/** The four tabs every signed-in user has. */
const BASE_TABS: readonly TabConfig[] = [
  { name: 'index', titleKey: 'home', icon: 'home' },
  { name: 'search', titleKey: 'search', icon: 'search' },
  { name: 'my-courses', titleKey: 'myCourses', icon: 'book-open' },
  { name: 'profile', titleKey: 'profile', icon: 'user' },
];

const STUDIO_TAB: TabConfig = { name: 'studio', titleKey: 'studio', icon: 'edit-3' };
const ADMIN_TAB: TabConfig = { name: 'admin', titleKey: 'admin', icon: 'shield' };

/** Every tab route that exists (the navigator registers all of them; the bar shows a subset). */
export const ALL_TABS: readonly TabConfig[] = [...BASE_TABS, STUDIO_TAB, ADMIN_TAB];

/**
 * Tabs a role sees (PLAN §2.4.7): a Student the four base tabs, a Teacher + "Teaching" (Studio),
 * an Admin + "Admin" as the fifth tab. The order matches `ALL_TABS`, which is the order the
 * navigator registers the screens in.
 */
export function getTabsForRole(role: Role | null | undefined): readonly TabConfig[] {
  const extra = role === 'TEACHER' ? STUDIO_TAB : role === 'ADMIN' ? ADMIN_TAB : null;
  return extra ? [...BASE_TABS, extra] : BASE_TABS;
}

/** Role-only routes under `(tabs)`: pathname -> the one role that may open it. */
const ROLE_ONLY_PATHS: Readonly<Record<string, Role>> = {
  '/studio': 'TEACHER',
  '/admin': 'ADMIN',
};

/**
 * `true` when `pathname` is a role-only tab (`/studio`, `/admin`) that `role` may not open - the
 * layout then redirects to Home (a student typing the URL on the web, a stale link...).
 */
export function isForbiddenTabPath(pathname: string, role: Role | null | undefined): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const required = ROLE_ONLY_PATHS[normalized];
  return required !== undefined && required !== role;
}
