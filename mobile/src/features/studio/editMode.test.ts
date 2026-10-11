import { CREATE_MODE, getCourseEditMode, getCurriculumTarget } from './editMode';
import { makeDetail, makeRevision } from './studioFixtures';

describe('getCourseEditMode', () => {
  it('lets a new course, a draft and a rejected course edit everything directly', () => {
    expect(CREATE_MODE.canEditMajor).toBe(true);
    for (const status of ['DRAFT', 'REJECTED'] as const) {
      expect(getCourseEditMode(makeDetail({ status }))).toMatchObject({
        kind: 'direct',
        canEditMinor: true,
        canEditMajor: true,
      });
    }
  });

  it('locks a course that is in review or hidden', () => {
    expect(getCourseEditMode(makeDetail({ status: 'PENDING_REVIEW' }))).toMatchObject({
      kind: 'locked',
      reason: 'pending',
      canEditMinor: false,
    });
    expect(getCourseEditMode(makeDetail({ status: 'ARCHIVED' }))).toMatchObject({
      kind: 'locked',
      reason: 'archived',
    });
  });

  it('sends the major fields of a published course through a revision', () => {
    expect(getCourseEditMode(makeDetail({ status: 'PUBLISHED' }))).toMatchObject({
      kind: 'published',
      canEditMinor: true,
      canEditMajor: false,
      revisionState: 'none',
    });
    for (const status of ['OPEN', 'REJECTED'] as const) {
      expect(
        getCourseEditMode(makeDetail({ status: 'PUBLISHED', revision: makeRevision(status) })),
      ).toMatchObject({ canEditMajor: true, revisionState: 'editable' });
    }
    expect(
      getCourseEditMode(
        makeDetail({ status: 'PUBLISHED', revision: makeRevision('PENDING_REVIEW') }),
      ),
    ).toMatchObject({ canEditMajor: false, revisionState: 'pending' });
  });
});

describe('getCurriculumTarget', () => {
  it('edits the course while it is a draft / rejected, else the revision', () => {
    expect(getCurriculumTarget(makeDetail({ status: 'DRAFT' }))).toBe('course');
    expect(getCurriculumTarget(makeDetail({ status: 'REJECTED' }))).toBe('course');
    expect(getCurriculumTarget(makeDetail({ status: 'PUBLISHED' }))).toBe('needsRevision');
    expect(
      getCurriculumTarget(makeDetail({ status: 'PUBLISHED', revision: makeRevision('OPEN') })),
    ).toBe('revision');
    expect(
      getCurriculumTarget(
        makeDetail({ status: 'PUBLISHED', revision: makeRevision('PENDING_REVIEW') }),
      ),
    ).toBe('locked');
    expect(getCurriculumTarget(makeDetail({ status: 'PENDING_REVIEW' }))).toBe('locked');
    expect(getCurriculumTarget(makeDetail({ status: 'ARCHIVED' }))).toBe('locked');
  });
});
