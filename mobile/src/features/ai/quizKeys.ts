import { useEffect } from 'react';
import { Platform } from 'react-native';

export type QuizKeyAction = { type: 'select'; optionIndex: number } | { type: 'next' };

/**
 * Maps a pressed key to a quiz action (web keyboard shortcuts): `1`-`4` choose an answer while the
 * question is open, `Enter` goes on once it is answered. Anything else - or a key pressed with
 * Ctrl / Cmd / Alt - is ignored.
 */
export function getQuizKeyAction(
  key: string,
  { optionCount, isAnswered }: { optionCount: number; isAnswered: boolean },
): QuizKeyAction | null {
  if (isAnswered) return key === 'Enter' ? { type: 'next' } : null;
  const digit = /^[1-9]$/.test(key) ? Number(key) : 0;
  return digit >= 1 && digit <= optionCount ? { type: 'select', optionIndex: digit - 1 } : null;
}

type UseQuizKeysOptions = {
  optionCount: number;
  isAnswered: boolean;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
};

/** Web only: wires `getQuizKeyAction` to the keyboard for the question on screen. */
export function useQuizKeys({ optionCount, isAnswered, onSelect, onNext }: UseQuizKeysOptions) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // A focused button already reacts to Enter itself: only handle it when nothing has focus.
      if (event.key === 'Enter' && document.activeElement !== document.body) return;
      const action = getQuizKeyAction(event.key, { optionCount, isAnswered });
      if (!action) return;
      if (action.type === 'select') onSelect(action.optionIndex);
      else onNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [optionCount, isAnswered, onSelect, onNext]);
}
