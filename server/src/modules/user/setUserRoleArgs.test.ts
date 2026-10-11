import { parseSetUserRoleArgs, SET_USER_ROLE_USAGE } from './setUserRoleArgs';

describe('parseSetUserRoleArgs', () => {
  it('defaults to dry-run and normalizes the email and role', () => {
    expect(parseSetUserRoleArgs(['--email', ' Admin@Example.COM ', '--role', 'admin'])).toEqual({
      email: 'admin@example.com',
      role: 'ADMIN',
      shouldApply: false,
    });
  });

  it('applies only with --apply, in any order', () => {
    expect(
      parseSetUserRoleArgs(['--apply', '--role', 'TEACHER', '--email', 'a@b.co']).shouldApply,
    ).toBe(true);
  });

  it('rejects missing, unknown or duplicated arguments', () => {
    const bad: string[][] = [
      [],
      ['--email', 'a@b.co'],
      ['--role', 'ADMIN'],
      ['--email', 'not-an-email', '--role', 'ADMIN'],
      ['--email', 'a@b.co', '--role', 'OWNER'],
      ['--email', 'a@b.co', '--role'],
      ['--email', '--role', 'ADMIN'],
      ['--email', 'a@b.co', '--role', 'ADMIN', '--apply', '--apply'],
      ['--email', 'a@b.co', '--email', 'c@d.co', '--role', 'ADMIN'],
      ['--email', 'a@b.co', '--role', 'ADMIN', '--force'],
    ];
    for (const args of bad) {
      expect(() => parseSetUserRoleArgs(args)).toThrow();
    }
    expect(() => parseSetUserRoleArgs(['--bogus'])).toThrow(SET_USER_ROLE_USAGE);
  });
});
