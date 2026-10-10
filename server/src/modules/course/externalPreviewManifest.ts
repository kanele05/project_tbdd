import { z } from 'zod';

import { courseId, previewLessonIds } from './courseIds';
import type { CoursePreviewUpdate } from './coursePreviewUpdate.service';

const MAX_SECONDS = 86_400;
/** Mỗi đoạn trích dài 45-180 giây (video gốc rất ngắn vẫn chia được thành hai đoạn). */
const MIN_EXCERPT_SECONDS = 45;
const MAX_EXCERPT_SECONDS = 180;

const excerptSchema = z
  .object({
    startSeconds: z.number().int().min(0).max(MAX_SECONDS),
    endSeconds: z.number().int().min(1).max(MAX_SECONDS),
  })
  .strict()
  .refine((excerpt) => {
    const length = excerpt.endSeconds - excerpt.startSeconds;
    return length >= MIN_EXCERPT_SECONDS && length <= MAX_EXCERPT_SECONDS;
  }, `Excerpt must last ${MIN_EXCERPT_SECONDS}-${MAX_EXCERPT_SECONDS} seconds`);

const externalPreviewSchema = z
  .object({
    slug: z.string().regex(/^[a-z]+(?:-[a-z0-9]+)*$/),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1).max(300),
    creator: z.string().trim().min(1).max(200),
    /** Đúng 2 đoạn của cùng một video: đoạn 1 cho bài 01, đoạn 2 cho bài 02. */
    excerpts: z.tuple([excerptSchema, excerptSchema]),
    playbackVerified: z.literal(true),
    verifiedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    ({ excerpts: [first, second] }) => second.startSeconds >= first.endSeconds,
    'Excerpts must be in increasing order and must not overlap',
  );

const externalPreviewManifestSchema = z
  .array(externalPreviewSchema)
  .min(1)
  .max(30)
  .refine((entries) => new Set(entries.map((entry) => entry.slug)).size === entries.length, {
    message: 'Duplicate course slug',
  });

export function parseExternalPreviewManifest(
  value: unknown,
  allowedSlugs: readonly string[],
): CoursePreviewUpdate[] {
  const entries = externalPreviewManifestSchema.parse(value);
  const knownSlugs = new Set(allowedSlugs);
  return entries.map((entry) => {
    if (!knownSlugs.has(entry.slug)) throw new Error(`Unknown course slug: ${entry.slug}`);
    const id = courseId(entry.slug);
    const [firstLessonId, secondLessonId] = previewLessonIds(id);
    const toLesson = (lessonId: string, excerpt: (typeof entry.excerpts)[number]) => {
      const videoUrl = new URL('https://www.youtube.com/watch');
      videoUrl.searchParams.set('v', entry.videoId);
      videoUrl.searchParams.set('start', String(excerpt.startSeconds));
      videoUrl.searchParams.set('end', String(excerpt.endSeconds));
      return {
        lessonId,
        videoUrl: videoUrl.toString(),
        durationSec: excerpt.endSeconds - excerpt.startSeconds,
      };
    };
    return {
      courseId: id,
      lessons: [
        toLesson(firstLessonId, entry.excerpts[0]),
        toLesson(secondLessonId, entry.excerpts[1]),
      ],
    };
  });
}
