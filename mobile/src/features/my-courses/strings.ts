import type { MyCoursesStatus } from '@/types/api';

/** Copy of the My Courses screen (English, matching the design). */
export const MY_COURSES_STRINGS = {
  title: 'My Courses',
  bannerTitle: 'Courses that boost your career!',
  bannerAction: 'Check Now',
  tabs: { all: 'All', ongoing: 'On going', completed: 'Completed' },
  loadFailed: "Couldn't load your courses",
  empty: {
    all: {
      title: "You haven't started any course yet",
      message: 'Find a course you like and start learning today.',
    },
    ongoing: {
      title: 'No course in progress',
      message: 'Courses you are learning will show up here.',
    },
    completed: {
      title: 'No completed course yet',
      message: 'Finish all the lessons of a course and it will show up here.',
    },
  },
  explore: 'Explore courses',
} as const;

export const MY_COURSES_TABS: readonly { key: MyCoursesStatus; label: string }[] = [
  { key: 'all', label: MY_COURSES_STRINGS.tabs.all },
  { key: 'ongoing', label: MY_COURSES_STRINGS.tabs.ongoing },
  { key: 'completed', label: MY_COURSES_STRINGS.tabs.completed },
];

/** Query param `?tab=` the Profile screen navigates with. */
export function parseTabParam(value: string | string[] | undefined): MyCoursesStatus | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'all' || raw === 'ongoing' || raw === 'completed' ? raw : null;
}
