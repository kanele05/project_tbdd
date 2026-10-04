import type { CourseSummary } from '@/types/api';

/**
 * Sample content of the dev-only UI kit preview (`/dev/ui-kit`). Not shipped to users: the route
 * renders nothing outside `__DEV__`. Texts exist in both languages so the preview can be checked
 * in vi and en (long Vietnamese strings are the layout stress test).
 */

export type PreviewLanguage = 'vi' | 'en';

function photo(id: string, width = 700): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const PHOTOS = {
  hero: photo('1611162617213-7d7a39e9b1d7', 1000),
  code: photo('1517694712202-14dd9538aa97'),
  design: photo('1559028012-481c04fa702d'),
  pen: photo('1455390582262-044cdead277a'),
  data: photo('1551288049-bebda4e38f71'),
  talk: photo('1543269865-cbf427effbad'),
} as const;

type CourseSeed = Pick<CourseSummary, 'id' | 'priceCents' | 'originalPriceCents' | 'badge'> & {
  photo: keyof typeof PHOTOS;
  rating: number;
  ratingCount: number;
  lessons: number;
  discountPercent?: number;
};

const SEEDS: readonly CourseSeed[] = [
  {
    id: 'sample-1',
    photo: 'code',
    priceCents: 4999,
    originalPriceCents: 8999,
    badge: 'DISCOUNT',
    discountPercent: 44,
    rating: 4.8,
    ratingCount: 2340,
    lessons: 42,
  },
  {
    id: 'sample-2',
    photo: 'pen',
    priceCents: 2499,
    originalPriceCents: null,
    badge: 'BEST_SELLER',
    rating: 4.8,
    ratingCount: 760,
    lessons: 18,
  },
  {
    id: 'sample-3',
    photo: 'data',
    priceCents: 0,
    originalPriceCents: null,
    badge: null,
    rating: 4.6,
    ratingCount: 1233,
    lessons: 30,
  },
  {
    id: 'sample-4',
    photo: 'design',
    priceCents: 3499,
    originalPriceCents: null,
    badge: null,
    rating: 4.9,
    ratingCount: 512,
    lessons: 24,
  },
];

const TITLES: Record<PreviewLanguage, readonly string[]> = {
  vi: [
    'React Native từ cơ bản đến nâng cao',
    'Viết sáng tạo và kể chuyện thuyết phục',
    'Phân tích dữ liệu với Python',
    'Thiết kế sản phẩm số từ con số 0',
  ],
  en: [
    'React Native from Basics to Advanced',
    'Creative Writing and Persuasive Storytelling',
    'Data Analysis with Python',
    'Digital Product Design from Scratch',
  ],
};

const TEACHERS = ['Nguyễn Minh Khoa', 'Trần Thu Hà', 'Vũ Thảo Vy', 'Phạm Quốc Bảo'] as const;

export function sampleCourses(language: PreviewLanguage): CourseSummary[] {
  return SEEDS.map((seed, index) => ({
    id: seed.id,
    title: TITLES[language][index] ?? seed.id,
    thumbnailUrl: PHOTOS[seed.photo],
    teacher: { id: `teacher-${index}`, fullName: TEACHERS[index] ?? 'Teacher' },
    priceCents: seed.priceCents,
    originalPriceCents: seed.originalPriceCents,
    badge: seed.badge,
    discountPercent: seed.discountPercent ?? null,
    ratingAvg: seed.rating,
    ratingCount: seed.ratingCount,
    lessonCount: seed.lessons,
    totalDurationSec: seed.lessons * 600,
    isBookmarked: index === 1,
  }));
}

export type PreviewCopy = {
  heroTitle: string;
  heroMeta: string;
  heroCta: string;
  heroPromo: string;
  sections: Record<
    | 'typography'
    | 'buttons'
    | 'chips'
    | 'tabs'
    | 'fields'
    | 'small'
    | 'cards'
    | 'rails'
    | 'ai'
    | 'states'
    | 'glass',
    string
  >;
  tabs: readonly string[];
  topics: readonly string[];
  email: string;
  emailError: string;
  password: string;
  aiTitle: string;
  aiSubtitle: string;
  aiBody: string;
  aiPlaceholder: string;
  aiPrompts: readonly string[];
  aiRowTitle: string;
  aiRowSubtitle: string;
  railTitle: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction: string;
  toast: string;
  glassCaption: string;
  tabLabels: readonly string[];
  typeSamples: Record<'hero' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'caption', string>;
};

export const COPY: Record<PreviewLanguage, PreviewCopy> = {
  vi: {
    heroTitle: 'Thiết kế sản phẩm số từ con số 0',
    heroMeta: '4,9 · 36 bài · 14 giờ · Trần Thu Hà',
    heroCta: 'Học thử miễn phí',
    heroPromo: 'Giảm 40% còn 2 ngày 14 giờ',
    sections: {
      typography: 'Chữ',
      buttons: 'Nút',
      chips: 'Chip chủ đề',
      tabs: 'Tab gạch chân',
      fields: 'Ô nhập liệu',
      small: 'Huy hiệu · Avatar · Tiến độ · Sao · Giá',
      cards: 'Thẻ khóa học dạng danh sách',
      rails: 'Rail khóa học',
      ai: 'Khối AI',
      states: 'Trống · Lỗi · Skeleton',
      glass: 'Kính và thanh tab nổi',
    },
    tabs: ['Tổng quan', 'Nội dung', 'Đánh giá', 'Hỏi đáp'],
    topics: ['Lập trình', 'Thiết kế', 'Kinh doanh', 'Ngoại ngữ'],
    email: 'Địa chỉ email',
    emailError: 'Email chưa đúng định dạng',
    password: 'Mật khẩu',
    aiTitle: 'AI Tutor',
    aiSubtitle: 'Trợ giảng riêng, hiểu đúng chỗ bạn đang vướng',
    aiBody: 'Bạn vừa trả lời sai 2 câu về useEffect. Ôn nhanh 5 phút trước khi sang Bài 13?',
    aiPlaceholder: 'Hỏi về Bài 12: useEffect và cleanup...',
    aiPrompts: ['Giải thích useEffect', 'Tạo 5 câu quiz', 'Lộ trình 30 ngày'],
    aiRowTitle: 'Hỏi AI Tutor về khóa học này',
    aiRowSubtitle: 'Tóm tắt, gợi ý lộ trình, giải đáp tức thì',
    railTitle: 'Dành riêng cho bạn',
    emptyTitle: 'Chưa có khóa học nào',
    emptyMessage: 'Khám phá hàng trăm khóa học và bắt đầu hành trình của bạn.',
    emptyAction: 'Khám phá khóa học',
    toast: 'Đã lưu vào danh sách yêu thích',
    glassCaption: 'Kính mờ trên ảnh',
    tabLabels: ['Trang chủ', 'Tìm kiếm', 'Khóa học của tôi', 'Hồ sơ'],
    typeSamples: {
      hero: 'Thiết kế sản phẩm số',
      h1: 'Chào mừng trở lại',
      h2: 'Tiếp tục xem',
      h3: 'Giảng viên nổi bật',
      title: 'Tiêu đề danh sách 16/24',
      body: 'Xây dựng ứng dụng di động thật từ A đến Z với React Native và Expo.',
      caption: 'Nguyễn Minh Khoa · 18 bài · 4,5 giờ',
    },
  },
  en: {
    heroTitle: 'Digital Product Design from Scratch',
    heroMeta: '4.9 · 36 lessons · 14 hours · Thu Ha Tran',
    heroCta: 'Try for free',
    heroPromo: '40% off, 2 days 14 hours left',
    sections: {
      typography: 'Type',
      buttons: 'Buttons',
      chips: 'Topic chips',
      tabs: 'Underline tabs',
      fields: 'Inputs',
      small: 'Badges, avatars, progress, stars, price',
      cards: 'List course cards',
      rails: 'Course rail',
      ai: 'AI block',
      states: 'Empty, error, skeleton',
      glass: 'Glass and floating tab bar',
    },
    tabs: ['Overview', 'Content', 'Reviews', 'Q&A'],
    topics: ['Programming', 'Design', 'Business', 'Languages'],
    email: 'Email address',
    emailError: 'This email is not valid',
    password: 'Password',
    aiTitle: 'AI Tutor',
    aiSubtitle: 'A personal teaching assistant that knows where you are stuck',
    aiBody: 'You missed 2 questions about useEffect. Take a 5-minute refresher before Lesson 13?',
    aiPlaceholder: 'Ask about Lesson 12: useEffect and cleanup...',
    aiPrompts: ['Explain useEffect', 'Make a 5-question quiz', '30-day roadmap'],
    aiRowTitle: 'Ask the AI Tutor about this course',
    aiRowSubtitle: 'Summaries, learning paths, instant answers',
    railTitle: 'Picked for you',
    emptyTitle: 'No courses yet',
    emptyMessage: 'Explore hundreds of courses and start your journey.',
    emptyAction: 'Explore courses',
    toast: 'Saved to your favorites',
    glassCaption: 'Frosted glass over a photo',
    tabLabels: ['Home', 'Search', 'My courses', 'Profile'],
    typeSamples: {
      hero: 'Digital product design',
      h1: 'Welcome back',
      h2: 'Continue watching',
      h3: 'Featured teachers',
      title: 'List title 16/24',
      body: 'Build real mobile apps from A to Z with React Native and Expo.',
      caption: 'Minh Khoa Nguyen · 18 lessons · 4.5 hours',
    },
  },
};
