import { isWideRoute } from './desktopLayout';

describe('WIDE_ROUTE_PATTERNS of WEB-05b (cart, checkout, notifications, profile, teacher)', () => {
  it.each([
    '/cart',
    '/cart/',
    '/checkout',
    '/notifications',
    '/profile',
    '/profile/edit',
    '/teacher/t1',
    '/teacher/t1/',
  ])('gives %s its own desktop layout', (path) => {
    expect(isWideRoute(path)).toBe(true);
  });

  it.each(['/teacher', '/teacher/t1/extra', '/profile/unknown', '/checkout/receipt'])(
    'keeps %s in the narrow column',
    (path) => {
      expect(isWideRoute(path)).toBe(false);
    },
  );
});
