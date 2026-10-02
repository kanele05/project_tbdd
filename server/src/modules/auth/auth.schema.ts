import { z } from 'zod';

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Invalid email address'));

export const registerBody = z.object({
  fullName: z
    .string({ error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name must be at most 60 characters'),
  email,
  // ≥ 8 ký tự, có chữ và số (FR-01); tối đa 72 vì bcrypt chỉ dùng 72 byte đầu.
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export const loginBody = z.object({
  email,
  // Không kiểm độ mạnh khi đăng nhập.
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required')
    .max(72, 'Password must be at most 72 characters'),
});

export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
