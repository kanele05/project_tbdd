import { getNotificationHref, NOTIFICATION_ICON } from './notificationMeta';

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

describe('NOTIFICATION_ICON', () => {
  it('has an icon for every notification type', () => {
    expect(Object.keys(NOTIFICATION_ICON).sort()).toEqual([
      'COURSE_COMPLETED',
      'NEW_ANSWER',
      'ORDER_PAID',
      'SYSTEM',
    ]);
  });
});
