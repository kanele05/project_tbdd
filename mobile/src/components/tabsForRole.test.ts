import { ALL_TABS, getTabsForRole, isForbiddenTabPath } from './tabsForRole';

const names = (role: Parameters<typeof getTabsForRole>[0]) =>
  getTabsForRole(role).map((tab) => tab.name);

describe('getTabsForRole', () => {
  it('gives a student the four base tabs', () => {
    expect(names('STUDENT')).toEqual(['index', 'search', 'my-courses', 'profile']);
    expect(names(undefined)).toEqual(['index', 'search', 'my-courses', 'profile']);
  });

  it('adds the Teaching tab for a teacher and the Admin tab for an admin as the fifth tab', () => {
    expect(names('TEACHER')).toEqual(['index', 'search', 'my-courses', 'profile', 'studio']);
    expect(names('ADMIN')).toEqual(['index', 'search', 'my-courses', 'profile', 'admin']);
  });

  it('keeps the visible tabs in the order the navigator registers them', () => {
    const registered = ALL_TABS.map((tab) => tab.name);
    for (const role of ['STUDENT', 'TEACHER', 'ADMIN'] as const) {
      expect(registered.filter((name) => names(role).includes(name))).toEqual(names(role));
    }
  });
});

describe('isForbiddenTabPath', () => {
  it('forbids /studio for everyone but a teacher and /admin for everyone but an admin', () => {
    expect(isForbiddenTabPath('/studio', 'STUDENT')).toBe(true);
    expect(isForbiddenTabPath('/studio', 'ADMIN')).toBe(true);
    expect(isForbiddenTabPath('/studio', 'TEACHER')).toBe(false);
    expect(isForbiddenTabPath('/admin', 'TEACHER')).toBe(true);
    expect(isForbiddenTabPath('/admin', undefined)).toBe(true);
    expect(isForbiddenTabPath('/admin', 'ADMIN')).toBe(false);
  });

  it('ignores a trailing slash and every other path', () => {
    expect(isForbiddenTabPath('/studio/', 'STUDENT')).toBe(true);
    expect(isForbiddenTabPath('/', 'STUDENT')).toBe(false);
    expect(isForbiddenTabPath('/profile', 'STUDENT')).toBe(false);
  });
});
