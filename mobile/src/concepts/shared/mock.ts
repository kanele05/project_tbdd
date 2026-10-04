import type { MockCategory, MockCourse, MockTeacher } from './types';

/** Unsplash photo ids already used by the server seed (known to exist, checked by eye). */
export const PHOTO = {
  codeLaptop: '1517694712202-14dd9538aa97',
  codeJs: '1461749280684-dccba630e2f6',
  dataDashboard: '1551288049-bebda4e38f71',
  tabletWireframe: '1586717791821-3f44a563fa4c',
  sketchWireframe: '1581291518857-4e27b48ff24e',
  monitorDesign: '1559028012-481c04fa702d',
  patternCorridor: '1502691876148-a84978e59af8',
  abstractPainting: '1541961017774-22349e4a1262',
  appIcons: '1611162617213-7d7a39e9b1d7',
  fountainPen: '1455390582262-044cdead277a',
  videoEditing: '1492619375914-88005aa9e8fb',
  timeline: '1574717024653-61fd2cf4d44d',
  cinema: '1536440136628-849c177e76a1',
  clapperboard: '1485846234645-a62644f84728',
  friendsTalking: '1543269865-cbf427effbad',
  studyDesk: '1501504905252-473c47e087f8',
  openBook: '1589998059171-988d887df646',
  lecture: '1524178232363-1fb2b075b655',
  teamWhiteboard: '1557804506-669a67965ba0',
  paintBrushes: '1513364776144-60967b0f800f',
  phoneUi: '1551650975-87deedd944c3',
  swatches: '1561070791-2526d30994b5',
} as const;

export function photoUrl(photoId: string, width = 600): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

export function portraitUrl(gender: 'men' | 'women', n: number): string {
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

export const USER = {
  name: 'Khang',
  fullName: 'Lê Hoàng Khang',
  avatar: portraitUrl('men', 46),
  level: 7,
  xp: 1240,
  xpNext: 1500,
  streak: 12,
  bestStreak: 21,
  /** Mon..Sun, true = studied that day. Today is Friday (index 4). */
  week: [true, true, true, true, false, false, false] as const,
  todayIndex: 4,
};

export const COURSES = {
  reactNative: {
    id: 'c1',
    title: 'React Native từ cơ bản đến nâng cao',
    teacher: 'Nguyễn Minh Khoa',
    teacherJob: 'Senior Mobile Engineer',
    category: 'Lập trình',
    photo: PHOTO.codeLaptop,
    rating: 4.8,
    ratingCount: 2340,
    students: 18452,
    lessons: 42,
    hours: 18.5,
    priceCents: 4999,
    originalPriceCents: 8999,
    badge: 'DISCOUNT',
    xp: 1200,
  },
  uiux: {
    id: 'c2',
    title: 'UI/UX: Thiết kế sản phẩm số từ con số 0',
    teacher: 'Trần Thu Hà',
    teacherJob: 'Product Design Lead',
    category: 'Thiết kế',
    photo: PHOTO.tabletWireframe,
    rating: 4.9,
    ratingCount: 1870,
    students: 12340,
    lessons: 36,
    hours: 14,
    priceCents: 3999,
    originalPriceCents: 7999,
    badge: 'BEST_SELLER',
    xp: 980,
  },
  python: {
    id: 'c3',
    title: 'Phân tích dữ liệu với Python và Pandas',
    teacher: 'Lê Quang Huy',
    teacherJob: 'Data Scientist',
    category: 'Lập trình',
    photo: PHOTO.dataDashboard,
    rating: 4.7,
    ratingCount: 3120,
    students: 21870,
    lessons: 48,
    hours: 21,
    priceCents: 4499,
    originalPriceCents: null,
    badge: 'BEST_SELLER',
    xp: 1400,
  },
  marketing: {
    id: 'c4',
    title: 'Marketing số cho người mới bắt đầu',
    teacher: 'Phạm Ngọc Anh',
    teacherJob: 'Growth Marketer',
    category: 'Kinh doanh',
    photo: PHOTO.teamWhiteboard,
    rating: 4.6,
    ratingCount: 980,
    students: 7410,
    lessons: 28,
    hours: 11,
    priceCents: 2999,
    originalPriceCents: null,
    badge: 'NEW',
    xp: 720,
  },
  video: {
    id: 'c5',
    title: 'Dựng phim chuyên nghiệp với Premiere Pro',
    teacher: 'Vũ Thảo Vy',
    teacherJob: 'Đạo diễn hình ảnh',
    category: 'Phim ảnh',
    photo: PHOTO.videoEditing,
    rating: 4.9,
    ratingCount: 1260,
    students: 9320,
    lessons: 40,
    hours: 16,
    priceCents: 5499,
    originalPriceCents: 9999,
    badge: 'DISCOUNT',
    xp: 1100,
  },
  ielts: {
    id: 'c6',
    title: 'IELTS 7.0+ trong 90 ngày',
    teacher: 'Hoàng Gia Bảo',
    teacherJob: 'IELTS Trainer 8.5',
    category: 'Ngoại ngữ',
    photo: PHOTO.friendsTalking,
    rating: 4.8,
    ratingCount: 4210,
    students: 30210,
    lessons: 60,
    hours: 32,
    priceCents: 5999,
    originalPriceCents: 9999,
    badge: 'DISCOUNT',
    xp: 1800,
  },
  writing: {
    id: 'c7',
    title: 'Viết sáng tạo và kể chuyện thuyết phục',
    teacher: 'Đỗ Hoài Nam',
    teacherJob: 'Biên tập viên',
    category: 'Viết lách',
    photo: PHOTO.fountainPen,
    rating: 4.8,
    ratingCount: 760,
    students: 5230,
    lessons: 24,
    hours: 9,
    priceCents: 2499,
    originalPriceCents: null,
    badge: null,
    xp: 640,
  },
  illustration: {
    id: 'c8',
    title: 'Vẽ minh họa số cho người mới',
    teacher: 'Ngô Khánh Linh',
    teacherJob: 'Illustrator',
    category: 'Thiết kế',
    photo: PHOTO.abstractPainting,
    rating: 4.7,
    ratingCount: 540,
    students: 4120,
    lessons: 30,
    hours: 12,
    priceCents: 3499,
    originalPriceCents: null,
    badge: 'NEW',
    xp: 800,
  },
} satisfies Record<string, MockCourse>;

export const POPULAR: MockCourse[] = [
  COURSES.uiux,
  COURSES.reactNative,
  COURSES.python,
  COURSES.video,
  COURSES.marketing,
];

export const RECOMMENDED: MockCourse[] = [COURSES.ielts, COURSES.writing, COURSES.illustration];

export type MockInspire = {
  id: string;
  title: string;
  teacher: string;
  photo: string;
  lessons: number;
};

export const INSPIRES: MockInspire[] = [
  {
    id: 'i1',
    title: 'Kể chuyện bằng hình ảnh động',
    teacher: 'Vũ Thảo Vy',
    photo: PHOTO.cinema,
    lessons: 18,
  },
  {
    id: 'i2',
    title: 'Viết như một tiểu thuyết gia',
    teacher: 'Đỗ Hoài Nam',
    photo: PHOTO.openBook,
    lessons: 22,
  },
  {
    id: 'i3',
    title: 'Màu sắc và cảm xúc trong thiết kế',
    teacher: 'Trần Thu Hà',
    photo: PHOTO.patternCorridor,
    lessons: 15,
  },
];

export const CATEGORIES: MockCategory[] = [
  { id: 'code', name: 'Lập trình', count: 128, icon: 'code' },
  { id: 'design', name: 'Thiết kế', count: 96, icon: 'palette' },
  { id: 'business', name: 'Kinh doanh', count: 84, icon: 'briefcase' },
  { id: 'writing', name: 'Viết lách', count: 42, icon: 'pen' },
  { id: 'movie', name: 'Phim ảnh', count: 37, icon: 'film' },
  { id: 'language', name: 'Ngoại ngữ', count: 71, icon: 'languages' },
];

export const TEACHERS: MockTeacher[] = [
  {
    id: 't1',
    name: 'Trần Thu Hà',
    field: 'Thiết kế sản phẩm',
    avatar: portraitUrl('women', 44),
    rating: 4.9,
    courses: 8,
    students: 24500,
  },
  {
    id: 't2',
    name: 'Nguyễn Minh Khoa',
    field: 'Lập trình di động',
    avatar: portraitUrl('men', 32),
    rating: 4.8,
    courses: 12,
    students: 31200,
  },
  {
    id: 't3',
    name: 'Vũ Thảo Vy',
    field: 'Dựng phim',
    avatar: portraitUrl('women', 68),
    rating: 4.9,
    courses: 5,
    students: 11800,
  },
  {
    id: 't4',
    name: 'Hoàng Gia Bảo',
    field: 'Luyện thi IELTS',
    avatar: portraitUrl('men', 75),
    rating: 4.8,
    courses: 9,
    students: 40100,
  },
  {
    id: 't5',
    name: 'Ngô Khánh Linh',
    field: 'Minh họa số',
    avatar: portraitUrl('women', 12),
    rating: 4.7,
    courses: 4,
    students: 6900,
  },
];

export const CONTINUE = {
  course: COURSES.reactNative,
  lessonNumber: 12,
  lessonTitle: 'Hooks nâng cao: useEffect và cleanup',
  minutesLeft: 8,
  progress: 0.68,
};

export const BANNER = {
  title: 'Ưu đãi tựu trường',
  subtitle: 'Giảm đến 40%',
  caption: 'Hơn 200 khóa học, kết thúc 05/10',
  cta: 'Xem ưu đãi',
  photo: PHOTO.patternCorridor,
};

export const AI = {
  title: 'AI Tutor gợi ý cho bạn',
  body: 'Bạn vừa trả lời sai 2 câu về useEffect. Ôn nhanh 5 phút trước khi sang Bài 13?',
  cta: 'Hỏi AI Tutor',
  prompts: ['Giải thích useEffect', 'Tạo 5 câu quiz', 'Lộ trình 30 ngày'],
};

export const DETAIL = {
  course: COURSES.reactNative,
  tabs: ['Tổng quan', 'Nội dung', 'Đánh giá', 'Hỏi đáp'],
  description:
    'Xây dựng ứng dụng di động thật từ A đến Z với React Native và Expo: điều hướng, quản lý trạng thái, gọi API, lưu cache và phát hành lên cửa hàng ứng dụng.',
  benefits: [
    'Tự tay xây 3 ứng dụng hoàn chỉnh trên iOS và Android',
    'Thành thạo Expo Router, TanStack Query và Zustand',
    'Tối ưu hiệu năng, tiếp cận và chế độ tối',
    'Nhận chứng chỉ hoàn thành và dự án cho hồ sơ',
  ],
  lessons: [
    { n: 1, title: 'Chào mừng và lộ trình khóa học', time: '03:20', isPreview: true },
    { n: 2, title: 'Cài đặt môi trường Expo trong 10 phút', time: '08:45', isPreview: true },
    { n: 3, title: 'Component, JSX và StyleSheet', time: '12:10', isPreview: false },
  ],
  updated: 'Cập nhật 09/2026',
};
