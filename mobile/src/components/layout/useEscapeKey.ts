import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Web only: calls `onEscape` when the Escape key is pressed while `isActive` (closes menus). */
export function useEscapeKey(isActive: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isActive || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);
}
