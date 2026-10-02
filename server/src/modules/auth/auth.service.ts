import { ApiError } from '@/lib/ApiError';
import { signToken } from '@/lib/jwt';
import { toUserDto, userDtoSelect } from '@/lib/mappers';
import { hashPassword, verifyPassword } from '@/lib/password';
import { Prisma, prisma } from '@/lib/prisma';
import type { UserDto } from '@/types/dto';

import type { LoginInput, RegisterInput } from './auth.schema';

export type AuthResult = { token: string; user: UserDto };

// Khi email không tồn tại vẫn so sánh với hash giả để thời gian phản hồi không lộ email nào đã đăng ký.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password-1');
  return dummyHash;
}

function issueToken(user: UserDto): string {
  return signToken({ id: user.id, role: user.role });
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw ApiError.conflict('EMAIL_TAKEN', 'Email already in use');

  const passwordHash = await hashPassword(input.password);
  try {
    const created = await prisma.user.create({
      data: { email: input.email, fullName: input.fullName, passwordHash, role: 'STUDENT' },
      select: userDtoSelect,
    });
    const user = toUserDto(created);
    return { token: issueToken(user), user };
  } catch (err) {
    // Hai request đăng ký cùng email chạy song song: DB chặn bằng unique index.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict('EMAIL_TAKEN', 'Email already in use');
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const found = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...userDtoSelect, passwordHash: true },
  });
  const matches = await verifyPassword(
    input.password,
    found?.passwordHash ?? (await getDummyHash()),
  );
  if (!found || !matches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }
  const user = toUserDto(found);
  return { token: issueToken(user), user };
}

export async function getMe(userId: string): Promise<UserDto> {
  const found = await prisma.user.findUnique({ where: { id: userId }, select: userDtoSelect });
  // Token còn hạn nhưng tài khoản đã bị xóa -> coi như chưa đăng nhập.
  if (!found) throw ApiError.unauthorized('Account no longer exists');
  return toUserDto(found);
}
