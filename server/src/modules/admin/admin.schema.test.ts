import { courseDecisionMail } from '@/lib/mailTemplates';

import {
  disableUserBody,
  listAdminCoursesQuery,
  moderationReasonBody,
  rejectCourseBody,
} from './admin.schema';
import { escapeLike } from './adminUser.service';

describe('listAdminCoursesQuery', () => {
  it('defaults to type=course, page 1, limit 20', () => {
    expect(listAdminCoursesQuery.parse({})).toEqual({ type: 'course', page: 1, limit: 20 });
  });

  it('accepts a status only when it belongs to the type', () => {
    expect(listAdminCoursesQuery.safeParse({ status: 'PUBLISHED' }).success).toBe(true);
    expect(listAdminCoursesQuery.safeParse({ type: 'revision', status: 'OPEN' }).success).toBe(
      true,
    );
    expect(listAdminCoursesQuery.safeParse({ type: 'revision', status: 'PUBLISHED' }).success).toBe(
      false,
    );
    expect(listAdminCoursesQuery.safeParse({ type: 'course', status: 'OPEN' }).success).toBe(false);
    expect(listAdminCoursesQuery.safeParse({ limit: 51 }).success).toBe(false);
  });
});

describe('reason bodies', () => {
  it('requires 5-500 trimmed characters for reject and disable', () => {
    expect(rejectCourseBody.parse({ reason: '  Too vague  ' })).toEqual({ reason: 'Too vague' });
    expect(rejectCourseBody.safeParse({ reason: 'abcd' }).success).toBe(false);
    expect(disableUserBody.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    expect(disableUserBody.safeParse({}).success).toBe(false);
  });

  it('makes the archive / restore reason optional', () => {
    expect(moderationReasonBody.parse(undefined)).toEqual({});
    expect(moderationReasonBody.parse({})).toEqual({});
    expect(moderationReasonBody.parse({ reason: 'Copyright claim' })).toEqual({
      reason: 'Copyright claim',
    });
    expect(moderationReasonBody.safeParse({ reason: 'abc' }).success).toBe(false);
  });
});

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('a_b%c\\d')).toBe('a\\_b\\%c\\\\d');
    expect(escapeLike('plain')).toBe('plain');
  });
});

describe('courseDecisionMail', () => {
  const base = { fullName: 'Tina <b>', courseTitle: 'Intro to <Go>', target: 'course' as const };

  it('is bilingual by default and carries the rejection reason in text and escaped HTML', () => {
    const mail = courseDecisionMail('both', {
      ...base,
      decision: 'REJECTED',
      reason: 'Needs <more> lessons',
    });
    expect(mail.subject).toContain('chưa được duyệt');
    expect(mail.subject).toContain('was not approved');
    expect(mail.text).toContain('Lý do từ người duyệt: Needs <more> lessons');
    expect(mail.text).toContain('Reason from the reviewer: Needs <more> lessons');
    expect(mail.html).toContain('Needs &lt;more&gt; lessons');
    expect(mail.html).not.toContain('<more>');
    expect(mail.html).not.toContain('Tina <b>');
  });

  it('renders a single language and omits the reason for approvals', () => {
    const mail = courseDecisionMail('en', {
      ...base,
      target: 'revision',
      decision: 'APPROVED',
      reason: 'ignored',
    });
    expect(mail.subject).toBe('Your course changes were approved - E-Learning');
    expect(mail.text).toContain('Hi Tina <b>,');
    expect(mail.text).not.toContain('ignored');
    expect(courseDecisionMail('vi', { ...base, decision: 'APPROVED' }).subject).toBe(
      'Khóa học của bạn đã được duyệt - E-Learning',
    );
  });
});
