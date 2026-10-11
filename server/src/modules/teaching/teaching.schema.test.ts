import { gradeBody, replyBody, submissionsQuery } from './teaching.schema';

describe('teaching schemas', () => {
  it('accepts grade 0..100 integers and trims feedback', () => {
    expect(gradeBody.parse({ grade: 0, feedback: ' ok ' })).toEqual({ grade: 0, feedback: 'ok' });
    expect(gradeBody.parse({ grade: 100, feedback: 'a'.repeat(2000) }).grade).toBe(100);
  });

  it.each([
    { grade: 101, feedback: 'x' },
    { grade: -1, feedback: 'x' },
    { grade: 1.5, feedback: 'x' },
    { grade: '10', feedback: 'x' },
    { grade: 10, feedback: '  ' },
    { grade: 10, feedback: 'a'.repeat(2001) },
    { feedback: 'x' },
  ])('rejects invalid grade body %j', (body) => {
    expect(gradeBody.safeParse(body).success).toBe(false);
  });

  it('limits reply length to 1-1000 after trimming', () => {
    expect(replyBody.parse({ reply: '  hi  ' }).reply).toBe('hi');
    expect(replyBody.safeParse({ reply: '   ' }).success).toBe(false);
    expect(replyBody.safeParse({ reply: 'a'.repeat(1001) }).success).toBe(false);
  });

  it('defaults the submissions filter to all and rejects unknown values', () => {
    expect(submissionsQuery.parse({})).toEqual({ page: 1, limit: 20, status: 'all' });
    expect(submissionsQuery.safeParse({ status: 'weird' }).success).toBe(false);
  });
});
