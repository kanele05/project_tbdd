/**
 * Dựng dữ liệu danh mục (khóa học, chương, bài, tag, tài liệu) trong bộ nhớ - KHÔNG chạm DB.
 * Kết quả được `prisma/seed.ts` ghi vào DB và `activity.ts` dùng để sinh hoạt động của học viên.
 */
import fs from 'node:fs';
import path from 'node:path';

import { courseId, COURSES, type CourseSeed } from './courses';
import { CURRICULUM } from './curriculum';
import { getExternalCoursePreview } from './externalCoursePreviews';
import { buildLessonContent } from './lessonContent';
import { PHOTO, staticUrl, unsplash, VIDEOS } from './media';
import { tagId } from './tags';
import { teacherByKey, TEACHERS } from './teachers';

const DAY_MS = 24 * 60 * 60 * 1000;

export type LessonRow = {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  order: number;
  /** Số thứ tự bài trong toàn khóa (1..N). */
  number: number;
  durationSec: number;
  videoUrl: string;
  isPreview: boolean;
  /** Ghi chú chữ của bài (nguồn cho AI) - sinh từ template theo danh mục, không gọi AI. */
  content: string;
};

export type SectionRow = { id: string; courseId: string; title: string; order: number };

export type CourseRow = {
  seed: CourseSeed;
  id: string;
  categoryId: string;
  teacherProfileId: string;
  createdAt: Date;
  lessons: LessonRow[];
};

export type ResourceRow = {
  id: string;
  courseId: string;
  name: string;
  fileUrl: string;
  sizeBytes: number;
  mimeType: string;
};

export type Catalog = {
  courses: CourseRow[];
  sections: SectionRow[];
  lessons: LessonRow[];
  courseTags: { courseId: string; tagId: string }[];
  resources: ResourceRow[];
};

const RESOURCE_FILES = [
  { name: 'Document 1.txt', mimeType: 'text/plain' },
  { name: 'Document 2.pdf', mimeType: 'application/pdf' },
] as const;

function resourceSize(fileName: string): number {
  const file = path.resolve(__dirname, '..', '..', 'static', 'resources', fileName);
  if (!fs.existsSync(file)) {
    throw new Error(`Thiếu ${file}. Chạy: npx tsx scripts/generateResources.ts`);
  }
  return fs.statSync(file).size;
}

export function buildCatalog(now: number): Catalog {
  const categoryIds: Record<string, string> = {
    business: 'cat_business',
    design: 'cat_design',
    code: 'cat_code',
    writing: 'cat_writing',
    movie: 'cat_movie',
    language: 'cat_language',
  };
  const catalog: Catalog = {
    courses: [],
    sections: [],
    lessons: [],
    courseTags: [],
    resources: [],
  };
  const resourceSizes = RESOURCE_FILES.map((f) => resourceSize(f.name));

  COURSES.forEach((seed, courseIndex) => {
    const id = courseId(seed.slug);
    const curriculum = CURRICULUM[seed.slug];
    if (!curriculum) throw new Error(`Thiếu chương trình học cho "${seed.slug}"`);

    const row: CourseRow = {
      seed,
      id,
      categoryId: categoryIds[seed.category] ?? '',
      teacherProfileId: teacherByKey(seed.teacher).profileId,
      createdAt: new Date(now - seed.ageDays * DAY_MS),
      lessons: [],
    };

    let number = 0;
    curriculum.forEach((section, sectionIndex) => {
      const sectionId = `sec_${id.slice(4)}_${sectionIndex + 1}`;
      catalog.sections.push({
        id: sectionId,
        courseId: id,
        title: section.title,
        order: sectionIndex + 1,
      });
      section.lessons.forEach((title, lessonIndex) => {
        number += 1;
        const video = VIDEOS[(courseIndex + number) % VIDEOS.length];
        if (!video) throw new Error('Danh sách VIDEOS rỗng');
        const preview = number <= 2 ? getExternalCoursePreview(seed.slug) : undefined;
        const lessonId = `les_${id.slice(4)}_${String(number).padStart(2, '0')}`;
        const lesson: LessonRow = {
          id: lessonId,
          sectionId,
          courseId: id,
          title,
          order: lessonIndex + 1,
          number,
          durationSec: preview?.durationSec ?? video.durationSec,
          videoUrl: preview?.url ?? video.url,
          isPreview: number <= 2, // 2 bài đầu xem thử (PLAN §11)
          content: buildLessonContent({
            lessonId,
            category: seed.category,
            courseTitle: seed.title,
            sectionTitle: section.title,
            lessonTitle: title,
          }),
        };
        row.lessons.push(lesson);
        catalog.lessons.push(lesson);
      });
    });

    seed.tags.forEach((tag) => catalog.courseTags.push({ courseId: id, tagId: tagId(tag) }));
    RESOURCE_FILES.forEach((file, i) => {
      catalog.resources.push({
        id: `res_${id.slice(4)}_${i + 1}`,
        courseId: id,
        name: file.name,
        fileUrl: staticUrl(`resources/${file.name}`),
        sizeBytes: resourceSizes[i] ?? 0,
        mimeType: file.mimeType,
      });
    });
    catalog.courses.push(row);
  });

  return catalog;
}

/** Ảnh bìa lớn (bannerUrl) của khóa học - cùng ảnh với thumbnail nhưng độ rộng lớn hơn. */
export const courseBannerUrl = (seed: CourseSeed): string => unsplash(seed.photo, 1200);
export const courseThumbnailUrl = (seed: CourseSeed): string => unsplash(seed.photo, 600);

export const teacherCount = TEACHERS.length;
export { PHOTO };
