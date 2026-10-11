import {
  buildQueueParams,
  isOpenableUrl,
  normalizeQueueStatus,
  QUEUE_STATUSES,
  toPercent,
} from './adminMeta';

describe('adminMeta', () => {
  it('builds queue params with the page size', () => {
    expect(buildQueueParams('course', 'PUBLISHED')).toEqual({
      type: 'course',
      status: 'PUBLISHED',
      limit: 20,
    });
  });

  it('falls back to pending when a revision is filtered by a course-only status', () => {
    expect(normalizeQueueStatus('revision', 'PUBLISHED')).toBe('PENDING_REVIEW');
    expect(normalizeQueueStatus('revision', 'ARCHIVED')).toBe('PENDING_REVIEW');
    expect(normalizeQueueStatus('revision', 'REJECTED')).toBe('REJECTED');
    expect(buildQueueParams('revision', 'ARCHIVED').status).toBe('PENDING_REVIEW');
  });

  it('offers only valid statuses per queue type', () => {
    expect(QUEUE_STATUSES.course).toHaveLength(4);
    expect(QUEUE_STATUSES.revision).toEqual(['PENDING_REVIEW', 'REJECTED']);
  });

  it('computes percentages safely', () => {
    expect(toPercent(1, 4)).toBe(25);
    expect(toPercent(0, 0)).toBe(0);
  });

  it('accepts only http(s) links as openable', () => {
    expect(isOpenableUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isOpenableUrl('javascript:alert(1)')).toBe(false);
    expect(isOpenableUrl('')).toBe(false);
  });
});
