/** 6 danh mục - icon Feather + màu theo design (CLAUDE.md §7 / Home - Course Listing.png). */
export type CategorySeed = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  order: number;
};

export const CATEGORIES: readonly CategorySeed[] = [
  {
    id: 'cat_business',
    slug: 'business',
    name: 'Business',
    icon: 'trending-up',
    color: '#00BDD6',
    order: 1,
  },
  {
    id: 'cat_design',
    slug: 'design',
    name: 'Design',
    icon: 'pen-tool',
    color: '#8353E2',
    order: 2,
  },
  { id: 'cat_code', slug: 'code', name: 'Code', icon: 'code', color: '#E05858', order: 3 },
  {
    id: 'cat_writing',
    slug: 'writing',
    name: 'Writing',
    icon: 'file-text',
    color: '#4069E5',
    order: 4,
  },
  { id: 'cat_movie', slug: 'movie', name: 'Movie', icon: 'video', color: '#8353E2', order: 5 },
  {
    id: 'cat_language',
    slug: 'language',
    name: 'Language',
    icon: 'globe',
    color: '#ED7D2D',
    order: 6,
  },
];

export type CategorySlug = 'business' | 'design' | 'code' | 'writing' | 'movie' | 'language';
