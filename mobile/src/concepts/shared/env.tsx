import { createContext, useContext, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Scheme } from './types';

export type ConceptEnvValue = {
  scheme: Scheme;
  /**
   * Screenshot mode: the screen lays out at its natural height (no inner ScrollView) so a tall
   * headless window can capture the whole page.
   */
  isFull: boolean;
  /** Status-bar height. On web there is no real inset, so a phone-like one is simulated. */
  topInset: number;
  bottomInset: number;
};

const ConceptEnv = createContext<ConceptEnvValue>({
  scheme: 'light',
  isFull: false,
  topInset: 44,
  bottomInset: 16,
});

type ProviderProps = { scheme: Scheme; isFull: boolean; children: ReactNode };

export function ConceptEnvProvider({ scheme, isFull, children }: ProviderProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const value: ConceptEnvValue = {
    scheme,
    isFull,
    topInset: isWeb ? 44 : insets.top,
    bottomInset: isWeb ? 16 : Math.max(insets.bottom, 8),
  };
  return <ConceptEnv.Provider value={value}>{children}</ConceptEnv.Provider>;
}

export function useConceptEnv(): ConceptEnvValue {
  return useContext(ConceptEnv);
}
