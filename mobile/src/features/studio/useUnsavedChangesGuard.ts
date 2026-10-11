import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { i18n } from '@/i18n';
import { confirmAction } from '@/utils/confirmAction';

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
      event.preventDefault();
      void confirmAction({
        title: i18n.t('studio:unsaved.title'),
        message: i18n.t('studio:unsaved.message'),
        confirmLabel: i18n.t('studio:unsaved.discard'),
        cancelLabel: i18n.t('studio:unsaved.keepEditing'),
        isDestructive: true,
      }).then((shouldDiscard) => {
        if (!shouldDiscard) return;
        isDirtyRef.current = false;
        navigation.dispatch(event.data.action);
      });
    });
  }, [navigation]);

  return {
    allowLeave: () => {
      isDirtyRef.current = false;
    },
  };
}
