import { MAX_UPLOAD_BYTES } from '@/constants/config';
import { i18n } from '@/i18n';

/** File types the server accepts for a project submission (CLAUDE.md §8: png, jpg, pdf, zip). */
export const SUBMISSION_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'zip'] as const;

/** MIME types offered to the document picker. */
export const SUBMISSION_PICKER_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
];

/** Cover images: png / jpg only (the server whitelist has no webp / heic). */
export const COVER_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  zip: 'application/zip',
  txt: 'text/plain',
};

/** Translated when asked (not at import time), so they follow the current language. */
export const getFileTooLargeMessage = (): string => i18n.t('project:file.tooLarge');
export const getFileUnsupportedMessage = (): string => i18n.t('project:file.unsupported');
export const getCoverUnsupportedMessage = (): string => i18n.t('project:file.coverUnsupported');

/** Lower-case extension without the dot: "Report.PDF" -> "pdf"; "" when there is none. */
export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * The MIME type sent to the server, derived from the extension. File managers sometimes report
 * `application/octet-stream` or `application/x-zip-compressed`, which the server would reject.
 */
export function getUploadMimeType(name: string, fallback?: string | null): string {
  return MIME_BY_EXTENSION[getFileExtension(name)] ?? fallback ?? 'application/octet-stream';
}

/** Human readable size: 512 -> "512 B", 626688 -> "612 KB", 36700160 -> "35 MB". */
export function formatFileSize(bytes: number): string {
  const safe = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (safe < 1024) return `${Math.round(safe)} B`;
  if (safe < 1024 * 1024) return `${Math.round(safe / 1024)} KB`;
  const megabytes = safe / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

export type CandidateFile = { name: string; size?: number | null };

/** Client-side check before uploading (PLAN.md SC-17). Returns an error message or `null`. */
export function validateSubmissionFile(file: CandidateFile): string | null {
  const extension = getFileExtension(file.name);
  if (!(SUBMISSION_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    return getFileUnsupportedMessage();
  }
  if (file.size != null && file.size > MAX_UPLOAD_BYTES) return getFileTooLargeMessage();
  return null;
}

/** Same as `validateSubmissionFile`, for the optional cover image. */
export function validateCoverImage(file: CandidateFile): string | null {
  const extension = getFileExtension(file.name);
  if (!(COVER_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    return getCoverUnsupportedMessage();
  }
  if (file.size != null && file.size > MAX_UPLOAD_BYTES) return getFileTooLargeMessage();
  return null;
}

/** Colors / label of the document icon of a resource row, by file type (`''` when unknown). */
export function getFileKind(name: string): {
  label: string;
  tone: 'danger' | 'primary' | 'orange' | 'blue' | 'textMuted';
} {
  const extension = getFileExtension(name);
  switch (extension) {
    case 'txt':
      return { label: '.txt', tone: 'danger' };
    case 'pdf':
      return { label: '.pdf', tone: 'primary' };
    case 'zip':
      return { label: '.zip', tone: 'orange' };
    case 'png':
    case 'jpg':
    case 'jpeg':
      return { label: `.${extension}`, tone: 'blue' };
    default:
      return { label: extension ? `.${extension}` : '', tone: 'textMuted' };
  }
}

/** Safe local file name for a downloaded resource. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'download';
}
