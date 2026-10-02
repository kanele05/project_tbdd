import { notify } from './notify';

function fakeDb() {
  const create = jest.fn().mockResolvedValue({ id: 'n-1' });
  return { db: { notification: { create } } as never, create };
}

describe('notify', () => {
  it('creates a notification with its data payload', async () => {
    const { db, create } = fakeDb();

    await notify(db, {
      userId: 'u-1',
      type: 'NEW_ANSWER',
      title: 'New answer',
      body: 'Someone answered',
      data: { courseId: 'c-1', questionId: 'q-1' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        type: 'NEW_ANSWER',
        title: 'New answer',
        body: 'Someone answered',
        data: { courseId: 'c-1', questionId: 'q-1' },
      },
      select: { id: true },
    });
  });

  it('omits data when none is given', async () => {
    const { db, create } = fakeDb();
    await notify(db, { userId: 'u-1', type: 'SYSTEM', title: 'Hi', body: 'Welcome', data: null });
    const args = create.mock.calls[0]?.[0] as { data: object };
    expect(args.data).not.toHaveProperty('data');
  });
});
