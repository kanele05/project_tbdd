import { resolveImageMimeType, type PickedImage } from '@/features/profile/useEditProfile';
import { i18n } from '@/i18n';

import type { CoverFile } from './api';
import { STUDIO_LIMITS } from './limits';

const COVER_TYPES = ['image/png', 'image/jpeg'];

/** Client-side check before uploading a cover: PNG / JPG up to 5 MB. Error message or `null`. */
export function validateCoverImage(image: PickedImage): string | null {
  const mimeType = resolveImageMimeType(image);
  if (mimeType && !COVER_TYPES.includes(mimeType)) return i18n.t('studio:cover.typeError');
  if (image.fileSize !== undefined && image.fileSize > STUDIO_LIMITS.coverMaxBytes) {
    return i18n.t('studio:cover.sizeError');
  }
  return null;
}

/** Multipart `file` descriptor (`uri`, `name`, `type`) for an accepted image. */
export function toCoverFile(image: PickedImage): CoverFile {
  const type = resolveImageMimeType(image) ?? 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const rawName = image.fileName?.trim() || `cover.${extension}`;
  const name = /\.[a-z0-9]+$/i.test(rawName) ? rawName : `${rawName}.${extension}`;
  return { uri: image.uri, name, type };
}
