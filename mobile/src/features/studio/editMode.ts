import type { StudioCourseDetailDto } from '@/types/api';

/**
 * What the teacher may do with a course, derived from its status and open revision (BR-19 / BR-21).
 * - `direct`: DRAFT / REJECTED - every field and the curriculum are saved on the course itself.
 * - `published`: PUBLISHED - minor fields save directly, major fields + curriculum live in the
 *   revision (`revisionState` says whether there is one to edit).
 * - `locked`: PENDING_REVIEW / ARCHIVED - the server refuses edits (422 `INVALID_COURSE_STATE`).
 */
export type CourseEditMode =
  | { kind: 'create'; canEditMinor: true; canEditMajor: true }
  | { kind: 'direct'; canEditMinor: true; canEditMajor: true }
  | {
      kind: 'published';
      canEditMinor: true;
      canEditMajor: boolean;
      /** `none` = create one first, `editable` = OPEN / REJECTED, `pending` = waiting for the admin. */
      revisionState: 'none' | 'editable' | 'pending';
    }
  | { kind: 'locked'; canEditMinor: false; canEditMajor: false; reason: 'pending' | 'archived' };

export const CREATE_MODE: CourseEditMode = {
  kind: 'create',
  canEditMinor: true,
  canEditMajor: true,
};

export function getCourseEditMode(
  course: Pick<StudioCourseDetailDto, 'status' | 'revision'>,
): CourseEditMode {
  switch (course.status) {
    case 'DRAFT':
    case 'REJECTED':
      return { kind: 'direct', canEditMinor: true, canEditMajor: true };
    case 'PUBLISHED': {
      const revision = course.revision;
      const revisionState = !revision
        ? 'none'
        : revision.status === 'PENDING_REVIEW'
          ? 'pending'
          : 'editable';
      return {
        kind: 'published',
        canEditMinor: true,
        canEditMajor: revisionState === 'editable',
        revisionState,
      };
    }
    case 'PENDING_REVIEW':
      return { kind: 'locked', canEditMinor: false, canEditMajor: false, reason: 'pending' };
    case 'ARCHIVED':
      return { kind: 'locked', canEditMinor: false, canEditMajor: false, reason: 'archived' };
  }
}

/** Where the curriculum is edited: on the course (`course`), in the revision, or not at all. */
export type CurriculumTarget = 'course' | 'revision' | 'needsRevision' | 'locked';

export function getCurriculumTarget(
  course: Pick<StudioCourseDetailDto, 'status' | 'revision'>,
): CurriculumTarget {
  const mode = getCourseEditMode(course);
  if (mode.kind === 'direct') return 'course';
  if (mode.kind === 'published') {
    if (mode.revisionState === 'editable') return 'revision';
    return mode.revisionState === 'none' ? 'needsRevision' : 'locked';
  }
  return 'locked';
}
