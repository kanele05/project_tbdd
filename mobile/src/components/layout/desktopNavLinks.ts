import type { Role } from '@/types/api';

/** Key of the label in the `common:tabs` namespace (same labels as the phone tab bar). */
export type NavLinkTitleKey = 'home' | 'myCourses' | 'studio' | 'admin';

export type NavLinkConfig = {
  key: string;
  href: '/' | '/my-courses' | '/studio' | '/admin';
  titleKey: NavLinkTitleKey;
  /** Extra path prefixes that keep the link highlighted (e.g. the player belongs to My courses). */
  alsoActiveFor?: readonly string[];
};

const HOME_LINK: NavLinkConfig = { key: 'home', href: '/', titleKey: 'home' };
const MY_COURSES_LINK: NavLinkConfig = {
  key: 'my-courses',
  href: '/my-courses',
  titleKey: 'myCourses',
  alsoActiveFor: ['/learn'],
};
const STUDIO_LINK: NavLinkConfig = { key: 'studio', href: '/studio', titleKey: 'studio' };
const ADMIN_LINK: NavLinkConfig = { key: 'admin', href: '/admin', titleKey: 'admin' };

/** Links of the desktop top bar: Home, My courses, then Teaching (teacher) or Admin (admin). */
export function getNavLinks(role: Role | null | undefined): readonly NavLinkConfig[] {
  if (role === 'TEACHER') return [HOME_LINK, MY_COURSES_LINK, STUDIO_LINK];
  if (role === 'ADMIN') return [HOME_LINK, MY_COURSES_LINK, ADMIN_LINK];
  return [HOME_LINK, MY_COURSES_LINK];
}

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** `true` when `pathname` belongs to `link` (Home only matches `/` exactly). */
export function isNavLinkActive(link: NavLinkConfig, pathname: string): boolean {
  const path = normalize(pathname);
  if (link.href === '/') return path === '/';
  return [link.href, ...(link.alsoActiveFor ?? [])].some((prefix) => hasPrefix(path, prefix));
}
