/**
 * Người dùng mẫu. TẤT CẢ tài khoản seed dùng chung một mật khẩu TEST (không phải mật khẩu thật).
 *
 * Tài khoản demo (dùng để đăng nhập trong app / video demo):
 *   email:    DEMO_ACCOUNT.email
 *   mật khẩu: SEED_PASSWORD
 * Email các user khác có dạng `ho.ten@example.com` (xem `email` bên dưới).
 */
import { PHOTO, portrait, unsplash } from './media';

export const SEED_PASSWORD = 'Learn2026';

export type UserSeed = {
  id: string;
  email: string;
  fullName: string;
  headline: string | null;
  avatarUrl: string;
  coverUrl: string | null;
};

function emailOf(fullName: string): string {
  return `${fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')}@example.com`;
}

function idOf(fullName: string): string {
  return `usr_${fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')}`;
}

function student(
  fullName: string,
  headline: string,
  gender: 'men' | 'women',
  photo: number,
  coverPhotoId: string | null = null,
): UserSeed {
  return {
    id: idOf(fullName),
    email: emailOf(fullName),
    fullName,
    headline,
    avatarUrl: portrait(gender, photo),
    coverUrl: coverPhotoId ? unsplash(coverPhotoId, 900) : null,
  };
}

/** Tài khoản demo - khớp design User Profile: "Martha Rosie - UX/UI Designer". */
export const DEMO_ACCOUNT: UserSeed = student(
  'Martha Rosie',
  'UX/UI Designer',
  'women',
  90,
  PHOTO.deskBright,
);

/** 20 học viên (gồm tài khoản demo): 12 tên theo PLAN §11 + 8 học viên bổ sung để đủ dữ liệu review. */
export const STUDENTS: readonly UserSeed[] = [
  DEMO_ACCOUNT,
  student('Jinny Oslin', 'Frontend Developer', 'women', 21),
  student('Jane Barry', 'Marketing Specialist', 'women', 57),
  student('Claire Mignard', 'Graphic Designer', 'women', 19),
  student('Thomas Carlson', 'Computer Science Student', 'men', 41),
  student('Jenny Barry', 'Content Writer', 'women', 50),
  student('Marcus Lee', 'Product Manager', 'men', 61),
  student('Priya Sharma', 'Data Analyst', 'women', 8),
  student('Daniel Kim', 'Mobile Developer', 'men', 17),
  student('Hannah Weber', 'Illustrator', 'women', 2),
  student('Oscar Diaz', 'Freelance Photographer', 'men', 9),
  student('Yuki Tanaka', 'UI Designer', 'women', 33),
  student('Liam Carter', 'Junior Developer', 'men', 12),
  student('Sofia Alvarez', 'Language Teacher', 'women', 65),
  student('Noah Bennett', 'Startup Founder', 'men', 28),
  student('Ava Thompson', 'Video Editor', 'women', 70),
  student('Ethan Brooks', 'Business Analyst', 'men', 36),
  student('Mia Nguyen', 'UX Researcher', 'women', 45),
  student('Lucas Ferreira', 'Backend Developer', 'men', 54),
  student('Chloe Martin', 'Copywriter', 'women', 14),
];

export const STUDENT_COUNT = STUDENTS.length;
