import type { CourseSummary, HomeResponse } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';

import { toSentenceCase } from './bannerText';

/** One page of the desktop billboard (the big banner of Home on wide screens). */
export type Billboard = {
  id: string;
  imageUrl: string;
  /** Short gold tag above the title ("20% Off", "Featured"). */
  tag: string | null;
  title: string;
  /** The featured course, when the banner points to one we already have. */
  course: CourseSummary | null;
  /** Course to open / preview; `null` when the banner points to a category. */
  courseId: string | null;
  /** Category to open when the banner points to a category. */
  categoryId: string | null;
};

const MAX_BILLBOARDS = 5;

function findCourse(home: HomeResponse, courseId: string): CourseSummary | null {
  const lists = [home.popular, home.recommended, home.inspires];
  for (const list of lists) {
    const found = list.find((course) => course.id === courseId);
    if (found) return found;
  }
  return null;
}

/** Billboard pages: the server banners; without banners, the most popular course. */
export function buildBillboards(home: HomeResponse, featuredTag: string): Billboard[] {
  if (home.banners.length > 0) {
    return home.banners.slice(0, MAX_BILLBOARDS).map((banner) => {
      const isCourse = banner.target.type === 'COURSE';
      return {
        id: banner.id,
        imageUrl: banner.imageUrl,
        tag: banner.subtitle,
        title: toSentenceCase(banner.title),
        course: isCourse ? findCourse(home, banner.target.id) : null,
        courseId: isCourse ? banner.target.id : null,
        categoryId: isCourse ? null : banner.target.id,
      };
    });
  }
  const course = home.popular[0];
  if (!course) return [];
  return [
    {
      id: course.id,
      imageUrl: course.thumbnailUrl,
      tag: getCourseBadge(course)?.label ?? featuredTag,
      title: course.title,
      course,
      courseId: course.id,
      categoryId: null,
    },
  ];
}
