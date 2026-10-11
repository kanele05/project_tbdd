import { api } from '@/lib/apiClient';

import { teachingApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: { get: jest.fn(), getPage: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mocked = api as unknown as Record<'get' | 'getPage' | 'put' | 'patch' | 'delete', jest.Mock>;

describe('teachingApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads and patches the teacher profile', async () => {
    await teachingApi.profile();
    expect(mocked.get).toHaveBeenCalledWith('/me/teacher-profile');

    await teachingApi.updateProfile({ jobTitle: 'Designer' });
    expect(mocked.patch).toHaveBeenCalledWith('/me/teacher-profile', { jobTitle: 'Designer' });
  });

  it('reads the stats of a course', async () => {
    await teachingApi.stats('c1');
    expect(mocked.get).toHaveBeenCalledWith('/teacher/courses/c1/stats');
  });

  it('lists the submissions of a course with the status filter and page', async () => {
    await teachingApi.submissions('c1', { status: 'ungraded', page: 2 });
    expect(mocked.getPage).toHaveBeenCalledWith('/teacher/courses/c1/submissions', {
      status: 'ungraded',
      page: 2,
      limit: 20,
    });
  });

  it('grades a submission', async () => {
    await teachingApi.grade('s1', { grade: 90, feedback: 'Great' });
    expect(mocked.put).toHaveBeenCalledWith('/teacher/submissions/s1/grade', {
      grade: 90,
      feedback: 'Great',
    });
  });

  it('replies to and deletes the reply of a review', async () => {
    await teachingApi.replyToReview('r1', { reply: 'Thanks' });
    expect(mocked.put).toHaveBeenCalledWith('/teacher/reviews/r1/reply', { reply: 'Thanks' });

    await teachingApi.deleteReviewReply('r1');
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/reviews/r1/reply');
  });

  it('pins and unpins an answer', async () => {
    await teachingApi.pinAnswer('a1');
    expect(mocked.put).toHaveBeenCalledWith('/teacher/answers/a1/pin');

    await teachingApi.unpinAnswer('a1');
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/answers/a1/pin');
  });
});
