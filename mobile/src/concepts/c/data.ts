/** Extra mock data that only the Aurora course-detail screen needs (lessons list, reviews, AI). */
import { portraitUrl } from '../shared/mock';

export type LessonRow = {
  n: number;
  title: string;
  time: string;
  state: 'preview' | 'locked' | 'done';
};

export const LESSON_ROWS: LessonRow[] = [
  { n: 1, title: 'Chào mừng và lộ trình khóa học', time: '03:20', state: 'preview' },
  { n: 2, title: 'Cài đặt môi trường Expo trong 10 phút', time: '08:45', state: 'preview' },
  { n: 3, title: 'Component, JSX và StyleSheet', time: '12:10', state: 'locked' },
  { n: 4, title: 'Điều hướng với Expo Router', time: '15:30', state: 'locked' },
];

export const LESSON_MORE = 38;

export const AI_SUMMARY = [
  {
    icon: 'users',
    label: 'Dành cho',
    text: 'Người đã biết JavaScript, muốn làm ứng dụng di động.',
  },
  { icon: 'clock', label: 'Thời lượng gợi ý', text: 'Khoảng 6 tuần, mỗi ngày 45 phút.' },
  { icon: 'target', label: 'Kết quả', text: 'Ba ứng dụng hoàn chỉnh để đưa vào hồ sơ.' },
] as const;

export const RATING_BARS: { stars: number; share: number }[] = [
  { stars: 5, share: 0.82 },
  { stars: 4, share: 0.12 },
  { stars: 3, share: 0.04 },
  { stars: 2, share: 0.01 },
  { stars: 1, share: 0.01 },
];

export type ReviewRow = {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  when: string;
  text: string;
};

export const REVIEWS: ReviewRow[] = [
  {
    id: 'r1',
    name: 'Phạm Quốc Bảo',
    avatar: portraitUrl('men', 12),
    stars: 5,
    when: '2 ngày trước',
    text: 'Bài giảng rõ ràng, ví dụ sát thực tế. Sau tuần thứ ba mình đã tự làm được ứng dụng đầu tiên.',
  },
  {
    id: 'r2',
    name: 'Nguyễn Thanh Mai',
    avatar: portraitUrl('women', 26),
    stars: 5,
    when: '1 tuần trước',
    text: 'Phần AI Tutor giải thích useEffect rất dễ hiểu, giúp mình bớt bối rối khi gặp lỗi.',
  },
];
