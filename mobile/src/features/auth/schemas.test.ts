import {
  forgotPasswordSchema,
  formatRecoveryCode,
  isCompleteRecoveryCode,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas';

function messagesFor(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const map: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    map[String(issue.path[0])] = issue.message;
  }
  return map;
}

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    expect(loginSchema.safeParse({ email: 'rosie@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires email and password', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(messagesFor(result)).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(messagesFor(result)).toEqual({ email: 'Enter a valid email address' });
  });

  it('trims surrounding spaces of the email', () => {
    const result = loginSchema.safeParse({ email: '  a@b.co  ', password: 'x' });
    expect(result.success && result.data.email).toBe('a@b.co');
  });
});

describe('registerSchema', () => {
  const valid = {
    fullName: 'Martha Rosie',
    email: 'rosie@example.com',
    password: 'abc12345',
    confirmPassword: 'abc12345',
  };

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a short full name', () => {
    expect(messagesFor(registerSchema.safeParse({ ...valid, fullName: 'A' }))).toEqual({
      fullName: 'Full name must be at least 2 characters',
    });
  });

  it('enforces password rules: length, a letter and a number', () => {
    const short = registerSchema.safeParse({ ...valid, password: 'a1', confirmPassword: 'a1' });
    expect(messagesFor(short).password).toBe('Password must be at least 8 characters');

    const noNumber = registerSchema.safeParse({
      ...valid,
      password: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    });
    expect(messagesFor(noNumber).password).toBe('Password must contain at least one number');

    const noLetter = registerSchema.safeParse({
      ...valid,
      password: '12345678',
      confirmPassword: '12345678',
    });
    expect(messagesFor(noLetter).password).toBe('Password must contain at least one letter');
  });

  it('requires the confirmation to match', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different1' });
    expect(messagesFor(result)).toEqual({ confirmPassword: 'Passwords do not match' });
  });
});

describe('password length', () => {
  it('rejects more than 72 characters (bcrypt limit)', () => {
    const long = `a1${'x'.repeat(71)}`;
    const result = registerSchema.safeParse({
      fullName: 'Martha Rosie',
      email: 'rosie@example.com',
      password: long,
      confirmPassword: long,
    });
    expect(messagesFor(result).password).toBe('Password must be at most 72 characters');
  });
});

describe('forgot / reset password schemas', () => {
  it('forgot password needs a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(messagesFor(forgotPasswordSchema.safeParse({ email: 'x' })).email).toBe(
      'Enter a valid email address',
    );
  });

  it('reset password needs a 6-digit code, a strong password and a matching confirmation', () => {
    const valid = { code: '123456', password: 'abc12345', confirmPassword: 'abc12345' };
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
    expect(messagesFor(resetPasswordSchema.safeParse({ ...valid, code: '12345' })).code).toBe(
      'Enter the 6-digit code',
    );
    expect(
      messagesFor(resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'other' }))
        .confirmPassword,
    ).toBe('Passwords do not match');
  });
});

describe('recovery code helpers', () => {
  it('formats what the user types as XXXXX-XXXXX', () => {
    expect(formatRecoveryCode('abcde')).toBe('ABCDE');
    expect(formatRecoveryCode('abcdef')).toBe('ABCDE-F');
    expect(formatRecoveryCode(' abcde fghjk ')).toBe('ABCDE-FGHJK');
    expect(formatRecoveryCode('ABCDE-FGHJK-EXTRA')).toBe('ABCDE-FGHJK');
  });

  it('drops characters the server never generates (0 O 1 I and symbols)', () => {
    expect(formatRecoveryCode('0O1I-!@#ab')).toBe('AB');
  });

  it('knows when a code is complete', () => {
    expect(isCompleteRecoveryCode('ABCDE-FGHJK')).toBe(true);
    expect(isCompleteRecoveryCode('abcdefghjk')).toBe(true);
    expect(isCompleteRecoveryCode('ABCDE')).toBe(false);
  });
});
