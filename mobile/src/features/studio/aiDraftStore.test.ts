import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';

import { useAiDraftStore } from './aiDraftStore';

async function readPersisted(): Promise<{ state: Record<string, unknown> } | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiDraftPlanned);
  return raw ? (JSON.parse(raw) as { state: Record<string, unknown> }) : null;
}

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

  describe('persistence (survives a reload)', () => {
    const PLANNED = { s1: [{ title: 'A', summary: 'About A' }] };

    it('saves only the planned lessons to AsyncStorage', async () => {
      useAiDraftStore.getState().queueFields({ subtitle: 'Sub' });
      useAiDraftStore.getState().requestAdvance();
      useAiDraftStore.getState().setPlannedLessons(PLANNED);

      const persisted = await readPersisted();
      expect(persisted?.state).toEqual({ plannedLessons: PLANNED });
    });

    it('restores the planned lessons after a reload', async () => {
      // What a previous page load left in AsyncStorage; the store in memory starts empty.
      await AsyncStorage.setItem(
        STORAGE_KEYS.aiDraftPlanned,
        JSON.stringify({ state: { plannedLessons: PLANNED }, version: 0 }),
      );
      expect(useAiDraftStore.getState().plannedLessons).toEqual({});

      await useAiDraftStore.persist.rehydrate();

      expect(useAiDraftStore.getState().plannedLessons).toEqual(PLANNED);
    });

    it('clear() also forgets the persisted lessons', async () => {
      useAiDraftStore.getState().setPlannedLessons(PLANNED);
      useAiDraftStore.getState().clear();

      expect((await readPersisted())?.state).toEqual({ plannedLessons: {} });
      await useAiDraftStore.persist.rehydrate();
      expect(useAiDraftStore.getState().plannedLessons).toEqual({});
    });
  });
});
