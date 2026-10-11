import { useAiDraftStore } from './aiDraftStore';

afterEach(() => {
  useAiDraftStore.getState().clear();
});

describe('useAiDraftStore', () => {
  it('merges queued fields and hands them over once', () => {
    const store = useAiDraftStore.getState();
    store.queueFields({ subtitle: 'Sub' });
    store.queueFields({ benefits: ['a'] });
    expect(useAiDraftStore.getState().takeFields()).toEqual({ subtitle: 'Sub', benefits: ['a'] });
    expect(useAiDraftStore.getState().takeFields()).toBeNull();
  });

  it('drops planned lessons one by one and forgets an emptied section', () => {
    useAiDraftStore.getState().setPlannedLessons({
      s1: [
        { title: 'A', summary: '' },
        { title: 'B', summary: '' },
      ],
    });
    useAiDraftStore.getState().removePlannedLesson('s1', 0);
    expect(useAiDraftStore.getState().plannedLessons.s1?.map((l) => l.title)).toEqual(['B']);
    useAiDraftStore.getState().removePlannedLesson('s1', 0);
    expect(useAiDraftStore.getState().plannedLessons).toEqual({});
  });
});
