import { COURSES } from './courses';
import { staticUrl } from './media';

export const COURSE_PREVIEW_DURATIONS_SEC: Readonly<Record<string, number>> = {
  'ux-foundation': 68,
  'website-design': 68,
  'ux-research-for-beginners': 68,
  'digital-portrait': 68,
  'workspace-decor': 68,
  'packaging-design': 68,
  'design-basics': 68,
  'digital-sketching': 68,
  'web-design': 68,
  'product-design': 68,
  'palettes-for-your-app': 68,
  'mobile-ui-design': 68,
  'creative-art-design': 68,
  'typography-in-ui-design': 68,
  'mobile-app-design': 68,
  'digital-poster': 68,
  'patterns-design': 68,
  'php-in-one-click': 72,
  'python-introduction': 72,
  'javascript-for-beginners': 72,
  'sql-essentials': 77,
  'java-fundamentals': 72,
  'project-management-essentials': 68,
  'digital-marketing-101': 68,
  'creative-writing-workshop': 68,
  'copywriting-that-sells': 68,
  'filmmaking-basics': 68,
  'video-editing-essentials': 68,
  'english-conversation': 68,
  'spanish-for-travelers': 68,
} satisfies Record<(typeof COURSES)[number]['slug'], number>;

export function getCoursePreview(slug: string): { url: string; durationSec: number } {
  const durationSec = COURSE_PREVIEW_DURATIONS_SEC[slug];
  if (!COURSES.some((course) => course.slug === slug) || durationSec === undefined) {
    throw new Error(`Unknown course preview slug: ${slug}`);
  }
  return { url: staticUrl(`previews/${slug}-v2.mp4`), durationSec };
}
