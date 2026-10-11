import { notificationMessage } from './notificationMessage';
import { notificationData, notify } from './notify';

function fakeDb() {
  const create = jest.fn().mockResolvedValue({ id: 'n-1' });
  return { db: { notification: { create } } as never, create };
}

describe('notify', () => {
  it('stores the English fallback text with ids, key and params in data', async () => {
    const { db, create } = fakeDb();

    await notify(db, {
      userId: 'u-1',
      message: notificationMessage('NEW_ANSWER', { author: 'Ann', courseTitle: 'UX' }),
      refs: { courseId: 'c-1', questionId: 'q-1' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        type: 'NEW_ANSWER',
        title: 'New answer to your question',
        body: 'Ann answered your question in "UX".',
        data: {
          courseId: 'c-1',
          questionId: 'q-1',
          key: 'NEW_ANSWER',
          params: { author: 'Ann', courseTitle: 'UX' },
        },
      },
      select: { id: true },
    });
  });

  it('stores only key and params when there are no ids', async () => {
    const { db, create } = fakeDb();
    await notify(db, {
      userId: 'u-1',
      message: notificationMessage('NEW_DEVICE', { device: 'Pixel 8' }, 'vi'),
    });
    const args = create.mock.calls[0]?.[0] as { data: { title: string; data: object } };
    expect(args.data.title).toBe('Đăng nhập từ thiết bị mới');
    expect(args.data.data).toEqual({ key: 'NEW_DEVICE', params: { device: 'Pixel 8' } });
  });
});

describe('notificationData', () => {
  it('merges the navigation ids with key and params', () => {
    const message = notificationMessage('REVIEW_REPLY', { courseTitle: 'UX' });
    expect(notificationData(message, { courseId: 'c-1', reviewId: 'r-1' })).toEqual({
      courseId: 'c-1',
      reviewId: 'r-1',
      key: 'REVIEW_REPLY',
      params: { courseTitle: 'UX' },
    });
  });
});
