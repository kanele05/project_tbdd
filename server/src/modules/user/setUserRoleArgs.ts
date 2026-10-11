export const SET_ROLE_VALUES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type SettableRole = (typeof SET_ROLE_VALUES)[number];

export type SetUserRoleArgs = {
  email: string;
  role: SettableRole;
  shouldApply: boolean;
};

export const SET_USER_ROLE_USAGE =
  'Usage: setUserRole --email <email> --role STUDENT|TEACHER|ADMIN [--apply]';

function isRole(value: string): value is SettableRole {
  return (SET_ROLE_VALUES as readonly string[]).includes(value);
}

/** Phân tích đối số CLI: bắt buộc `--email` và `--role`; mặc định dry-run, chỉ ghi DB khi có `--apply`. */
export function parseSetUserRoleArgs(args: readonly string[]): SetUserRoleArgs {
  let email: string | undefined;
  let role: SettableRole | undefined;
  let shouldApply = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') {
      if (shouldApply) throw new Error(SET_USER_ROLE_USAGE);
      shouldApply = true;
    } else if (arg === '--email' || arg === '--role') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Provide a value after ${arg}. ${SET_USER_ROLE_USAGE}`);
      }
      if (arg === '--email') {
        if (email !== undefined) throw new Error(SET_USER_ROLE_USAGE);
        email = value.trim().toLowerCase();
      } else {
        const upper = value.trim().toUpperCase();
        if (role !== undefined || !isRole(upper)) throw new Error(SET_USER_ROLE_USAGE);
        role = upper;
      }
      index += 1;
    } else {
      throw new Error(SET_USER_ROLE_USAGE);
    }
  }
  if (!email || !email.includes('@')) {
    throw new Error(`A valid --email is required. ${SET_USER_ROLE_USAGE}`);
  }
  if (!role) throw new Error(`--role is required. ${SET_USER_ROLE_USAGE}`);
  return { email, role, shouldApply };
}
