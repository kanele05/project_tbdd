import {
  isNotificationMessageKey,
  NOTIFICATION_MESSAGES,
  notificationMessage,
} from './notificationMessage';

describe('notificationMessage', () => {
  it.each([
    ['NEW_DEVICE', { device: 'Pixel 8' }, 'SYSTEM', 'New device sign-in'],
    ['ORDER_PAID_ONE', { courseTitle: 'UX' }, 'ORDER_PAID', 'Payment successful'],
    ['ORDER_PAID_MANY', { count: 3 }, 'ORDER_PAID', 'Payment successful'],
    [
      'NEW_ANSWER',
      { author: 'Ann', courseTitle: 'UX' },
      'NEW_ANSWER',
      'New answer to your question',
    ],
    ['COURSE_COMPLETED', { courseTitle: 'UX' }, 'COURSE_COMPLETED', 'Course completed'],
    ['COURSE_APPROVED', { courseTitle: 'UX' }, 'COURSE_APPROVED', 'Your course was approved'],
    [
      'REVISION_APPROVED',
      { courseTitle: 'UX' },
      'COURSE_APPROVED',
      'Your course changes were approved',
    ],
    [
      'COURSE_REJECTED',
      { courseTitle: 'UX', reason: 'Add lessons' },
      'COURSE_REJECTED',
      'Your course was not approved',
    ],
    [
      'REVISION_REJECTED',
      { courseTitle: 'UX', reason: 'Add lessons' },
      'COURSE_REJECTED',
      'Your course changes were not approved',
    ],
    [
      'NEW_COURSE',
      { teacher: 'Tom', courseTitle: 'UX' },
      'NEW_COURSE',
      'New course from an instructor you follow',
    ],
    [
      'PROJECT_GRADED',
      { projectTitle: 'Logo', courseTitle: 'UX', grade: 85 },
      'PROJECT_GRADED',
      'Your project was graded',
    ],
    [
      'REVIEW_REPLY',
      { courseTitle: 'UX' },
      'REVIEW_REPLY',
      'The instructor replied to your review',
    ],
  ] as const)('%s carries its key and params in data', (key, params, type, title) => {
    const message = notificationMessage(key, params as never);
    expect(message).toMatchObject({ type, title, data: { key, params } });
    expect(message.body.length).toBeGreaterThan(0);
  });

  it('writes the NEW_DEVICE fallback in the sign-in language and the rest in English', () => {
    expect(notificationMessage('NEW_DEVICE', { device: 'Pixel 8' }, 'vi').body).toBe(
      'Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: Pixel 8. Nếu không phải bạn, hãy đổi mật khẩu.',
    );
    expect(
      notificationMessage('NEW_COURSE', { teacher: 'Tom', courseTitle: 'UX' }, 'vi').body,
    ).toBe('Tom published "UX".');
  });

  it('knows exactly the registered keys', () => {
    for (const key of Object.keys(NOTIFICATION_MESSAGES)) {
      expect(isNotificationMessageKey(key)).toBe(true);
    }
    expect(isNotificationMessageKey('NOPE')).toBe(false);
    expect(isNotificationMessageKey(5)).toBe(false);
  });
});
