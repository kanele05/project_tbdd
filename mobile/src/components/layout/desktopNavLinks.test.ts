import { getNavLinks, isNavLinkActive } from './desktopNavLinks';

describe('getNavLinks', () => {
  it('gives a student Home and My courses only', () => {
    expect(getNavLinks('STUDENT').map((link) => link.href)).toEqual(['/', '/my-courses']);
    expect(getNavLinks(null).map((link) => link.href)).toEqual(['/', '/my-courses']);
  });

  it('adds Teaching for a teacher and Admin for an admin', () => {
    expect(getNavLinks('TEACHER').map((link) => link.href)).toEqual([
      '/',
      '/my-courses',
      '/studio',
    ]);
    expect(getNavLinks('ADMIN').map((link) => link.href)).toEqual(['/', '/my-courses', '/admin']);
  });
});

describe('isNavLinkActive', () => {
  const [home, myCourses, studio] = getNavLinks('TEACHER');

  it('matches Home on the root path only', () => {
    expect(home && isNavLinkActive(home, '/')).toBe(true);
    expect(home && isNavLinkActive(home, '/my-courses')).toBe(false);
    expect(home && isNavLinkActive(home, '/course/abc')).toBe(false);
  });

  it('matches a section and its sub-pages, ignoring a trailing slash', () => {
    expect(studio && isNavLinkActive(studio, '/studio')).toBe(true);
    expect(studio && isNavLinkActive(studio, '/studio/c1/edit')).toBe(true);
    expect(studio && isNavLinkActive(studio, '/studio/')).toBe(true);
    expect(studio && isNavLinkActive(studio, '/studios')).toBe(false);
  });

  it('keeps My courses highlighted while a lesson is playing', () => {
    expect(myCourses && isNavLinkActive(myCourses, '/learn/c1')).toBe(true);
    expect(myCourses && isNavLinkActive(myCourses, '/my-courses')).toBe(true);
    expect(myCourses && isNavLinkActive(myCourses, '/search')).toBe(false);
  });
});
