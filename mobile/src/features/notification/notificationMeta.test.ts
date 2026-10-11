import { i18n } from '@/i18n';

import {
  getNotificationHref,
  getNotificationIcon,
  getNotificationText,
  getNotificationTitle,
  NOTIFICATION_ICON,
} from './notificationMeta';

describe('getNotificationHref', () => {
  it('opens the question for a new answer (question wins over course)', () => {
    expect(getNotificationHref({ courseId: 'c1', questionId: 'q1' })).toBe('/question/q1');
  });

  it('opens the course when only courseId is present', () => {
    expect(getNotificationHref({ courseId: 'c1' })).toBe('/course/c1');
  });

  it('returns null when there is no target', () => {
    expect(getNotificationHref(null)).toBeNull();
    expect(getNotificationHref({})).toBeNull();
  });
});

describe('getNotificationHref by type (PLAN §2.4)', () => {
  const data = { courseId: 'c1' };

  it.each([
    ['COURSE_APPROVED', '/studio/c1'],
    ['COURSE_REJECTED', '/studio/c1'],
    ['NEW_COURSE', '/course/c1'],
    ['PROJECT_GRADED', '/learn/c1?tab=projects'],
    ['REVIEW_REPLY', '/course/c1/reviews'],
    ['COURSE_COMPLETED', '/course/c1'],
  ] as const)('%s opens %s', (type, href) => {
    expect(getNotificationHref(data, type)).toBe(href);
  });

  it('passes the course to the question so the teacher can pin replies', () => {
    expect(getNotificationHref({ courseId: 'c1', questionId: 'q1' }, 'NEW_ANSWER')).toBe(
      '/question/q1?courseId=c1',
    );
  });

  it('has no target without a course', () => {
    expect(getNotificationHref({}, 'COURSE_APPROVED')).toBeNull();
  });
});

describe('getNotificationTitle', () => {
  it('translates the teacher / admin types and keeps the server title for the others', () => {
    expect(getNotificationTitle({ type: 'PROJECT_GRADED', title: 'Your project was graded' })).toBe(
      'Your project was graded',
    );
    expect(getNotificationTitle({ type: 'COURSE_APPROVED', title: 'x' })).toBe(
      'Your course was approved',
    );
    expect(getNotificationTitle({ type: 'ORDER_PAID', title: 'Order paid' })).toBe('Order paid');
  });
});

describe('NOTIFICATION_ICON', () => {
  it('has an icon for every notification type', () => {
    expect(Object.keys(NOTIFICATION_ICON).sort()).toEqual([
      'COURSE_APPROVED',
      'COURSE_COMPLETED',
      'COURSE_REJECTED',
      'NEW_ANSWER',
      'NEW_COURSE',
      'ORDER_PAID',
      'PROJECT_GRADED',
      'REVIEW_REPLY',
      'SYSTEM',
    ]);
  });

  it('falls back to the system icon for an unknown notification type', () => {
    expect(getNotificationIcon('SOMETHING_NEW')).toBe(NOTIFICATION_ICON.SYSTEM);
    expect(getNotificationIcon('PROJECT_GRADED')).toBe(NOTIFICATION_ICON.PROJECT_GRADED);
  });
});

describe('getNotificationText', () => {
  const base = { type: 'COURSE_REJECTED', title: 'Stored title', body: 'Stored body' } as const;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders a known key with its params in the UI language, and follows a language switch', async () => {
    const notification = {
      ...base,
      data: { key: 'COURSE_REJECTED', params: { courseTitle: 'UX', reason: 'Add lessons' } },
    };
    expect(getNotificationText(notification)).toEqual({
      title: 'Your course was not approved',
      body: '"UX": Add lessons',
    });

    await i18n.changeLanguage('vi');
    expect(getNotificationText(notification)).toEqual({
      title: 'Khóa học của bạn chưa được duyệt',
      body: '"UX": Add lessons',
    });
  });

  it('tells a revision decision from a course decision by key', () => {
    const text = getNotificationText({
      ...base,
      data: { key: 'REVISION_REJECTED', params: { courseTitle: 'UX', reason: 'x' } },
    });
    expect(text.title).toBe('Your course changes were not approved');
  });

  it('fills numeric params (grade, count) and the new-device message', async () => {
    expect(
      getNotificationText({
        type: 'PROJECT_GRADED',
        title: 'x',
        body: 'y',
        data: {
          key: 'PROJECT_GRADED',
          params: { projectTitle: 'Logo', courseTitle: 'UX', grade: 85 },
        },
      }).body,
    ).toBe('Your project "Logo" in "UX" received 85/100.');
    expect(
      getNotificationText({
        type: 'ORDER_PAID',
        title: 'x',
        body: 'y',
        data: { key: 'ORDER_PAID_MANY', params: { count: 3 } },
      }).body,
    ).toBe('You are now enrolled in 3 courses. Start learning today!');

    await i18n.changeLanguage('vi');
    expect(
      getNotificationText({
        type: 'SYSTEM',
        title: 'New device sign-in',
        body: 'English stored text',
        data: { key: 'NEW_DEVICE', params: { device: 'Pixel 8' } },
      }),
    ).toEqual({
      title: 'Đăng nhập từ thiết bị mới',
      body: 'Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: Pixel 8. Nếu không phải bạn, hãy đổi mật khẩu.',
    });
  });

  it('does not HTML-escape params', () => {
    const text = getNotificationText({
      type: 'NEW_COURSE',
      title: 'x',
      body: 'y',
      data: { key: 'NEW_COURSE', params: { teacher: "O'Brien", courseTitle: 'R&D <101>' } },
    });
    expect(text.body).toBe('O\'Brien published "R&D <101>".');
  });

  it('falls back to the stored text for an unknown key, missing params or old rows', () => {
    expect(
      getNotificationText({ ...base, data: { key: 'FUTURE_KEY', params: { courseTitle: 'UX' } } }),
    ).toEqual({ title: 'Your course was not approved', body: 'Stored body' });
    expect(
      getNotificationText({
        ...base,
        data: { key: 'COURSE_REJECTED', params: { courseTitle: 'UX' } },
      }),
    ).toEqual({ title: 'Your course was not approved', body: 'Stored body' });
    expect(getNotificationText({ ...base, data: { key: 'COURSE_REJECTED' } })).toMatchObject({
      body: 'Stored body',
    });
    expect(
      getNotificationText({ type: 'SYSTEM', title: 'Welcome', body: 'Thanks', data: null }),
    ).toEqual({ title: 'Welcome', body: 'Thanks' });
    expect(
      getNotificationText({
        type: 'ORDER_PAID',
        title: 'Payment successful',
        body: 'Stored',
        data: { key: 'toString', params: { a: 'b' } },
      }),
    ).toEqual({ title: 'Payment successful', body: 'Stored' });
  });
});
