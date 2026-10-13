import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { i18n } from '@/i18n';
import { confirmAction } from '@/utils/confirmAction';

/**
 * Shared by every guard of the app: a screen can hold several (the wizard guards the course form
 * and, on step 4, the revision curriculum), but leaving it must ask only once.
 */
let isPromptOpen = false;
let discardedAction: object | null = null;

/**
 * Asks "Discard changes?" before the screen is left (Back button, gesture, header arrow) while
 * `isDirty` is true. Call `allowLeave()` right before navigating away on purpose (after a save).
 */
export function useUnsavedChangesGuard(isDirty: boolean): { allowLeave: () => void } {
  const navigation = useNavigation();
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!isDirtyRef.current) return;
      // Another guard of this screen already got "discard" for this very navigation.
      if (event.data.action === discardedAction) return;
      event.preventDefault();
      if (isPromptOpen) return;
      isPromptOpen = true;
      void confirmAction({
        title: i18n.t('studio:unsaved.title'),
        message: i18n.t('studio:unsaved.message'),
        confirmLabel: i18n.t('studio:unsaved.discard'),
        cancelLabel: i18n.t('studio:unsaved.keepEditing'),
        isDestructive: true,
      })
        .then((shouldDiscard) => {
          if (!shouldDiscard) return;
          isDirtyRef.current = false;
          discardedAction = event.data.action;
          try {
            navigation.dispatch(event.data.action);
          } finally {
            discardedAction = null;
          }
        })
        .finally(() => {
          isPromptOpen = false;
        });
    });
  }, [navigation]);

  return {
    allowLeave: () => {
      isDirtyRef.current = false;
    },
  };
}
