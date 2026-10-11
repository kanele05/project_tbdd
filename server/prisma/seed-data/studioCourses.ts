/**
 * Dữ liệu seed cho luồng Giảng viên & Quản trị (PLAN §2.4.5, BR-30):
 *  - tài khoản ADMIN `admin@example.com` (cùng SEED_PASSWORD với mọi tài khoản mẫu);
 *  - 1 khóa `DRAFT` (đủ điều kiện BR-20 - giảng viên bấm "Gửi duyệt" ngay được) của Sara Weise;
 *  - 1 khóa `PENDING_REVIEW` (đã gửi duyệt, có lịch sử SUBMITTED) của Christian để admin demo duyệt.
 * Hai khóa này nằm NGOÀI `COURSES` (30 khóa đã xuất bản) nên không ảnh hưởng dữ liệu hoạt động (activity.ts).
 * Video: các đoạn YouTube đã kiểm chứng trong externalCoursePreviewManifest.json (không upload video, BR/QĐ 4).
 */
import manifest from './externalCoursePreviewManifest.json';
import { PHOTO, unsplash } from './media';
import { tagId } from './tags';
import { teacherByKey } from './teachers';

export const ADMIN_ACCOUNT = {
  id: 'usr_admin',
  email: 'admin@example.com',
  fullName: 'Admin',
  headline: 'Platform Administrator',
} as const;

type ManifestEntry = (typeof manifest)[number];

function manifestEntry(slug: string): ManifestEntry {
  const entry = manifest.find((item) => item.slug === slug);
  if (!entry) throw new Error(`Thiếu "${slug}" trong externalCoursePreviewManifest.json`);
  return entry;
}

/** Một đoạn video YouTube (dạng chuẩn `watch?v=`), thời lượng = độ dài đoạn. */
function clip(slug: string, excerptIndex: 0 | 1): { videoUrl: string; durationSec: number } {
  const entry = manifestEntry(slug);
  const excerpt = entry.excerpts[excerptIndex];
  if (!excerpt) throw new Error(`Thiếu đoạn ${excerptIndex} của "${slug}"`);
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', entry.videoId);
  url.searchParams.set('start', String(excerpt.startSeconds));
  url.searchParams.set('end', String(excerpt.endSeconds));
  return { videoUrl: url.toString(), durationSec: excerpt.endSeconds - excerpt.startSeconds };
}

export type StudioLessonSeed = {
  title: string;
  slug: string;
  excerpt: 0 | 1;
  isPreview: boolean;
  content: string;
};

export type StudioSectionSeed = { title: string; lessons: StudioLessonSeed[] };

export type StudioCourseSeed = {
  id: string;
  status: 'DRAFT' | 'PENDING_REVIEW';
  title: string;
  subtitle: string;
  description: string;
  category: string;
  teacherKey: string;
  thumbnailUrl: string;
  priceCents: number;
  originalPriceCents: number | null;
  tags: string[];
  benefits: string[];
  projectDescription: string;
  ageDays: number;
  /** Số ngày trước khi gửi duyệt (chỉ với PENDING_REVIEW). */
  submittedDaysAgo: number | null;
  sections: StudioSectionSeed[];
};

export const STUDIO_COURSES: readonly StudioCourseSeed[] = [
  {
    id: 'crs_studio_design_systems',
    status: 'DRAFT',
    title: 'Design Systems with Figma',
    subtitle: 'Build a reusable component library your whole team can use',
    description:
      'Learn how to turn scattered screens into a design system: colour and type tokens, reusable components, variants and clear documentation. You will build a small library in Figma and see how it keeps a product consistent as it grows.',
    category: 'cat_design',
    teacherKey: 'sara',
    thumbnailUrl: unsplash(PHOTO.laptopDesign, 600),
    priceCents: 5400,
    originalPriceCents: 7900,
    tags: ['Figma', 'Typography'],
    benefits: [
      'Define colour, type and spacing tokens',
      'Build components with variants in Figma',
      'Document a system so developers can use it',
    ],
    projectDescription:
      'Pick a small app and build a design system for it: tokens, five core components and a one-page usage guide.',
    ageDays: 6,
    submittedDaysAgo: null,
    sections: [
      {
        title: 'Foundations',
        lessons: [
          {
            title: 'Why design systems matter',
            slug: 'mobile-ui-design',
            excerpt: 0,
            isPreview: true,
            content:
              'A design system is a shared set of tokens, components and rules. It saves time, keeps screens consistent and makes hand-off to developers predictable. In this lesson we look at real examples and the cost of not having one.',
          },
          {
            title: 'Colour and type tokens',
            slug: 'palettes-for-your-app',
            excerpt: 0,
            isPreview: false,
            content:
              'Tokens give names to design decisions: primary colour, body text size, spacing step. Set them up as Figma variables so a change in one place updates every screen. Start with a small palette and a clear type scale.',
          },
        ],
      },
      {
        title: 'Components',
        lessons: [
          {
            title: 'Building a button with variants',
            slug: 'product-design',
            excerpt: 0,
            isPreview: false,
            content:
              'Create a button component with variants for size, state and emphasis. Use auto layout so labels of any length look right. Check every state: default, hover, pressed and disabled.',
          },
          {
            title: 'Documenting and sharing the library',
            slug: 'palettes-for-your-app',
            excerpt: 1,
            isPreview: false,
            content:
              'A system is only useful if people can find and trust it. Publish the library, write short usage notes for each component and agree who approves changes so the system stays healthy.',
          },
        ],
      },
    ],
  },
  {
    id: 'crs_studio_node_api',
    status: 'PENDING_REVIEW',
    title: 'Build a REST API with Node.js',
    subtitle: 'From first route to a tested, documented JSON API',
    description:
      'Create a small REST API step by step with JavaScript and Node.js. You will design routes, validate input, return clear errors and organise the code so it is easy to test and extend. Great for beginners who already know basic JavaScript.',
    category: 'cat_code',
    teacherKey: 'christian',
    thumbnailUrl: unsplash(PHOTO.codeLaptop, 600),
    priceCents: 6900,
    originalPriceCents: null,
    tags: ['Javascript', 'SQL'],
    benefits: [
      'Design clean REST routes and status codes',
      'Validate input and handle errors properly',
      'Structure a Node.js project for testing',
    ],
    projectDescription:
      'Build a notes API with create, read, update and delete routes, input validation and a short README with example requests.',
    ageDays: 3,
    submittedDaysAgo: 1,
    sections: [
      {
        title: 'Getting started',
        lessons: [
          {
            title: 'What is a REST API?',
            slug: 'javascript-for-beginners',
            excerpt: 0,
            isPreview: true,
            content:
              'A REST API exposes resources over HTTP. Each URL names a thing, and the HTTP method says what to do with it. We cover resources, methods, status codes and JSON bodies with simple examples.',
          },
          {
            title: 'Your first route',
            slug: 'javascript-for-beginners',
            excerpt: 1,
            isPreview: true,
            content:
              'Set up a Node.js project, install a web framework and write a route that returns JSON. Run it, call it from the browser and from the command line, and read the response.',
          },
        ],
      },
      {
        title: 'Data and quality',
        lessons: [
          {
            title: 'Querying data with SQL',
            slug: 'sql-essentials',
            excerpt: 0,
            isPreview: false,
            content:
              'Most APIs store data in a database. Learn the basic SELECT, INSERT, UPDATE and DELETE statements and how to filter and sort rows, so your routes can read and write real data.',
          },
          {
            title: 'Joining tables for richer responses',
            slug: 'sql-essentials',
            excerpt: 1,
            isPreview: false,
            content:
              'Real data is spread over several tables. Use joins to combine them in one query and return everything a client needs in a single response, without many round trips.',
          },
          {
            title: 'Validating input and returning clear errors',
            slug: 'python-introduction',
            excerpt: 0,
            isPreview: false,
            content:
              'Never trust input. Validate every body, query and parameter, and answer with a clear error code and message. Good errors make an API easy to use and easy to debug.',
          },
        ],
      },
    ],
  },
];

export const studioCourseTagIds = (seed: StudioCourseSeed): string[] =>
  seed.tags.map((name) => tagId(name));

export const studioTeacherIds = (seed: StudioCourseSeed) => {
  const teacher = teacherByKey(seed.teacherKey);
  return { profileId: teacher.profileId, userId: teacher.userId };
};

export const studioLessonMedia = (lesson: StudioLessonSeed) => clip(lesson.slug, lesson.excerpt);
