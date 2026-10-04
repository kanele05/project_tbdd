/** Types shared by the three UI concepts (A / B / C). Concept code is mock-only, no API calls. */
export type Scheme = 'light' | 'dark';
export type ConceptScreen = 'home' | 'course';
export type ConceptId = 'a' | 'b' | 'c';

export type CourseBadge = 'BEST_SELLER' | 'DISCOUNT' | 'NEW';

export type MockCourse = {
  id: string;
  title: string;
  teacher: string;
  teacherJob: string;
  category: string;
  photo: string;
  rating: number;
  ratingCount: number;
  students: number;
  lessons: number;
  hours: number;
  priceCents: number;
  originalPriceCents: number | null;
  badge: CourseBadge | null;
  xp: number;
};

export type MockTeacher = {
  id: string;
  name: string;
  field: string;
  avatar: string;
  rating: number;
  courses: number;
  students: number;
};

export type CategoryIcon = 'code' | 'palette' | 'briefcase' | 'pen' | 'film' | 'languages';

export type MockCategory = {
  id: string;
  name: string;
  count: number;
  icon: CategoryIcon;
};
