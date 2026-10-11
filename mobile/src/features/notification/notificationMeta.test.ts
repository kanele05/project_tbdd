import {
  getNotificationHref,
  getNotificationIcon,
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
