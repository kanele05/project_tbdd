import { z } from 'zod';

import type { CoursePreviewUpdate } from './coursePreviewUpdate.service';

const MAX_SECONDS = 86_400;

const externalPreviewSchema = z
  .object({
    slug: z.string().regex(/^[a-z]+(?:-[a-z0-9]+)*$/),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1).max(300),
    creator: z.string().trim().min(1).max(200),
    startSeconds: z.number().int().min(0).max(MAX_SECONDS),
    endSeconds: z.number().int().min(1).max(MAX_SECONDS),
    playbackVerified: z.literal(true),
    verifiedAt: z.iso.datetime(),
  })
  .strict()
  .refine((entry) => entry.endSeconds > entry.startSeconds, 'Invalid excerpt bounds');

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
    const id = `crs_${entry.slug.replace(/-/g, '_')}`;
    const videoUrl = new URL('https://www.youtube.com/watch');
    videoUrl.searchParams.set('v', entry.videoId);
    videoUrl.searchParams.set('start', String(entry.startSeconds));
    videoUrl.searchParams.set('end', String(entry.endSeconds));
    return {
      courseId: id,
      lessonIds: [`les_${id.slice(4)}_01`, `les_${id.slice(4)}_02`],
      videoUrl: videoUrl.toString(),
      durationSec: entry.endSeconds - entry.startSeconds,
    };
  });
}
