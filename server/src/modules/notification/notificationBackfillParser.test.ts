import { NOTIFICATION_MESSAGES, notificationMessage } from '@/lib/notificationMessage';
import type { NotificationMessageKey } from '@/types/dto';

import { parseStoredNotification } from './notificationBackfillParser';

describe('parseStoredNotification', () => {
  const samples = {
    NEW_DEVICE: { device: 'Chrome on Windows' },
    ORDER_PAID_ONE: { courseTitle: 'UX Foundation: "Basics". Part 2' },
    ORDER_PAID_MANY: { count: 3 },
    NEW_ANSWER: { author: 'Helper Two', courseTitle: 'UX Foundation' },
    COURSE_COMPLETED: { courseTitle: 'Color Palettes' },
    COURSE_APPROVED: { courseTitle: 'My "Great" Course' },
    REVISION_APPROVED: { courseTitle: 'Revised title' },
    COURSE_REJECTED: { courseTitle: 'My Course', reason: 'Add more lessons: at least 5.\nThanks.' },
    REVISION_REJECTED: { courseTitle: 'My Course', reason: 'Title is misleading.' },
    NEW_COURSE: { teacher: 'Jane Doe', courseTitle: 'Typography 101' },
    PROJECT_GRADED: { projectTitle: 'Final project', courseTitle: 'Typography 101', grade: 85 },
    REVIEW_REPLY: { courseTitle: 'Typography 101' },
  } as const;

  it('covers every registered key', () => {
    expect(Object.keys(samples).sort()).toEqual(Object.keys(NOTIFICATION_MESSAGES).sort());
  });

  it.each(Object.keys(samples) as NotificationMessageKey[])(
    'round-trips %s from its stored text (English)',
    (key) => {
      const params = samples[key];
      const stored = notificationMessage(key, params as never);
      expect(parseStoredNotification(stored)).toEqual({ key, params });
    },
  );

  it.each(['en', 'vi'] as const)('parses the new-device alert written in %s', (lang) => {
    const stored = notificationMessage('NEW_DEVICE', { device: 'Pixel 8. Android' }, lang);
    expect(parseStoredNotification(stored)).toEqual({
      key: 'NEW_DEVICE',
      params: { device: 'Pixel 8. Android' },
    });
  });

  it('parses the literal Vietnamese and English new-device texts shipped to users', () => {
    expect(
      parseStoredNotification({
        type: 'SYSTEM',
        title: 'Đăng nhập từ thiết bị mới',
        body: 'Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: Chrome trên Windows. Nếu không phải bạn, hãy đổi mật khẩu.',
      }),
    ).toEqual({ key: 'NEW_DEVICE', params: { device: 'Chrome trên Windows' } });
    expect(
      parseStoredNotification({
        type: 'SYSTEM',
        title: 'New device sign-in',
        body: "Your account was signed in from a new device: Pixel 8. If this wasn't you, change your password.",
      }),
    ).toEqual({ key: 'NEW_DEVICE', params: { device: 'Pixel 8' } });
  });

  it('tells a single purchase from a multi-course purchase', () => {
    expect(
      parseStoredNotification({
        type: 'ORDER_PAID',
        title: 'Payment successful',
        body: 'You are now enrolled in 2 courses. Start learning today!',
      }),
    ).toEqual({ key: 'ORDER_PAID_MANY', params: { count: 2 } });
    expect(
      parseStoredNotification({
        type: 'ORDER_PAID',
        title: 'Payment successful',
        body: 'You are now enrolled in UX Foundation. Start learning today!',
      }),
    ).toEqual({ key: 'ORDER_PAID_ONE', params: { courseTitle: 'UX Foundation' } });
  });

  it('tells a course decision from a revision decision by the stored title', () => {
    const body = '"Intro": Please fix the preview.';
    expect(
      parseStoredNotification({
        type: 'COURSE_REJECTED',
        title: 'Your course was not approved',
        body,
      }),
    ).toEqual({
      key: 'COURSE_REJECTED',
      params: { courseTitle: 'Intro', reason: 'Please fix the preview.' },
    });
    expect(
      parseStoredNotification({
        type: 'COURSE_REJECTED',
        title: 'Your course changes were not approved',
        body,
      }),
    ).toMatchObject({ key: 'REVISION_REJECTED' });
  });

  it('parses the older seed wording (no quotes, trailing "!")', () => {
    expect(
      parseStoredNotification({
        type: 'COURSE_COMPLETED',
        title: 'Course completed!',
        body: 'Congratulations! You completed Color Palettes.',
      }),
    ).toEqual({ key: 'COURSE_COMPLETED', params: { courseTitle: 'Color Palettes' } });
    expect(
      parseStoredNotification({
        type: 'NEW_ANSWER',
        title: 'New answer to your question',
        body: 'Martha Hall answered your question in Typography Basics.',
      }),
    ).toEqual({
      key: 'NEW_ANSWER',
      params: { author: 'Martha Hall', courseTitle: 'Typography Basics' },
    });
  });

  it('returns null for unknown wording, a type mismatch or a free-text SYSTEM message', () => {
    expect(
      parseStoredNotification({ type: 'SYSTEM', title: 'Welcome', body: 'Welcome aboard!' }),
    ).toBeNull();
    expect(
      parseStoredNotification({
        type: 'REVIEW_REPLY',
        title: 'Payment successful',
        body: 'You are now enrolled in 2 courses. Start learning today!',
      }),
    ).toBeNull();
    expect(
      parseStoredNotification({
        type: 'ORDER_PAID',
        title: 'Payment successful',
        body: 'Thanks for your order',
      }),
    ).toBeNull();
  });
});
