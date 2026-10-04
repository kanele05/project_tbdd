import { openCourse, openCourseList } from '@/features/search/navigation';
import type { BannerDto, HomeResponse } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';

import { toSentenceCase } from './bannerText';
import type { HeroSlide } from './components/HomeHero';

function handlePressBanner(banner: BannerDto): void {
  if (banner.target.type === 'COURSE') openCourse(banner.target.id);
  else openCourseList({ categoryId: banner.target.id });
}

type HeroLabels = { featuredTag: string; viewCourse: string };

/** Hero pages: the server banners; without banners, the most popular course. */
export function buildHeroSlides(home: HomeResponse, labels: HeroLabels): HeroSlide[] {
  if (home.banners.length > 0) {
    return home.banners.map((banner) => {
      const title = toSentenceCase(banner.title);
      const ctaLabel = toSentenceCase(banner.ctaText);
      return {
        id: banner.id,
        imageUrl: banner.imageUrl,
        tag: banner.subtitle,
        title,
        ctaLabel,
        ctaAccessibilityLabel: `${ctaLabel}, ${title}`,
        backgroundColor: banner.bgColor,
        onPress: () => handlePressBanner(banner),
      };
    });
  }
  const course = home.popular[0];
  if (!course) return [];
  return [
    {
      id: course.id,
      imageUrl: course.thumbnailUrl,
      tag: getCourseBadge(course)?.label ?? labels.featuredTag,
      title: course.title,
      ctaLabel: labels.viewCourse,
      ctaAccessibilityLabel: `${labels.viewCourse}, ${course.title}`,
      onPress: () => openCourse(course.id),
    },
  ];
}
