import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { makeCourse } from '@/components/course/courseFixtures';
import type { CategoryDto, CourseSummary, HomeResponse, Paginated, TagDto } from '@/types/api';

/** Test helpers shared by the Home / Search / Filter / Course list / Profile screen tests. */

const clients: QueryClient[] = [];

afterEach(() => {
  // Dropping the caches stops React Query's timers so Jest can exit.
  clients.splice(0).forEach((client) => client.clear());
});

export function createTestClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  clients.push(client);
  return client;
}

/** Render `ui` inside a fresh `QueryClientProvider`. */
export async function renderWithClient(ui: ReactElement) {
  const client = createTestClient();
  const utils = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...utils, client };
}

export function makePage(
  courses: CourseSummary[],
  meta: Partial<Paginated<CourseSummary>['meta']> = {},
): Paginated<CourseSummary> {
  return {
    data: courses,
    meta: { page: 1, limit: 20, total: courses.length, totalPages: 1, ...meta },
  };
}

export const SAMPLE_CATEGORIES: CategoryDto[] = [
  {
    id: 'cat_business',
    name: 'Business',
    slug: 'business',
    icon: 'trending-up',
    color: '#00BDD6',
    courseCount: 6,
  },
  {
    id: 'cat_design',
    name: 'Design',
    slug: 'design',
    icon: 'pen-tool',
    color: '#8353E2',
    courseCount: 9,
  },
  {
    id: 'cat_code',
    name: 'Code',
    slug: 'code',
    icon: 'code',
    color: '#E05858',
    courseCount: 5,
  },
];

export const SAMPLE_TAGS: TagDto[] = [
  { id: 'tag_java', name: 'Java', isHot: true },
  { id: 'tag_sql', name: 'SQL', isHot: true },
];

export function makeHome(overrides: Partial<HomeResponse> = {}): HomeResponse {
  return {
    banners: [
      {
        id: 'ban_1',
        title: 'Project management',
        subtitle: '20% OFF',
        ctaText: 'JOIN NOW',
        imageUrl: 'https://example.com/banner.png',
        bgColor: '#8353E2',
        target: { type: 'CATEGORY', id: 'cat_business' },
      },
    ],
    categories: SAMPLE_CATEGORIES,
    popular: [makeCourse({ id: 'pop-1', title: 'PHP in One Click' })],
    recommended: [makeCourse({ id: 'rec-1', title: 'Website Design' })],
    inspires: [makeCourse({ id: 'ins-1', title: 'Digital Portrait' })],
    topTeachers: [
      {
        id: 'tch_1',
        fullName: 'Christian Hayes',
        avatarUrl: null,
        organization: 'University of Oxford',
        ratingAvg: 4.5,
        ratingCount: 1233,
      },
    ],
    ...overrides,
  };
}
