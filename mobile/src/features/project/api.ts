import { api } from '@/lib/apiClient';
import type { CourseProjectDto, ProjectSubmissionDto } from '@/types/api';

import { getUploadMimeType } from './fileUtils';

/** A file chosen with the document / image picker, ready to be uploaded. */
export type PickedFile = { uri: string; name: string; mimeType: string; size?: number };

export type SubmissionInput = {
  title: string;
  description?: string;
  file: PickedFile;
  /** Optional cover image. */
  image?: PickedFile | null;
};

/**
 * Builds the multipart body of `POST /courses/:id/submissions`: `title`, `description?`, `file`,
 * `image?`. React Native's FormData accepts `{ uri, name, type }` objects as file parts.
 */
export function buildSubmissionForm(input: SubmissionInput): FormData {
  const form = new FormData();
  form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  const toPart = (picked: PickedFile) =>
    ({
      uri: picked.uri,
      name: picked.name,
      type: getUploadMimeType(picked.name, picked.mimeType),
    }) as unknown as Blob;
  form.append('file', toPart(input.file));
  if (input.image) form.append('image', toPart(input.image));
  return form;
}

/** HTTP calls of the Projects tab (SC-15) and Submit project (SC-17). All need enrollment. */
export const projectApi = {
  /** `GET /courses/:id/project` -> description, resources, submission count. */
  detail: (courseId: string) => api.get<CourseProjectDto>(`/courses/${courseId}/project`),

  /** `GET /courses/:id/submissions` - newest first. */
  submissions: (courseId: string, page: number, limit: number) =>
    api.getPage<ProjectSubmissionDto>(`/courses/${courseId}/submissions`, { page, limit }),

  /** `POST /courses/:id/submissions` (multipart, 201). 413 / 415 / 403 on bad files / not enrolled. */
  submit: (courseId: string, input: SubmissionInput, onProgress?: (percent: number) => void) =>
    api.postForm<ProjectSubmissionDto>(
      `/courses/${courseId}/submissions`,
      buildSubmissionForm(input),
      onProgress,
    ),
};
