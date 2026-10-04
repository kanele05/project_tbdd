import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { ConceptHost } from '@/concepts/ConceptHost';
import type { ConceptId, ConceptScreen, Scheme } from '@/concepts/shared/types';

type Params = {
  id?: string;
  scheme?: string;
  screen?: string;
  full?: string;
  controls?: string;
  marker?: string;
};

function toConceptId(value: string | undefined): ConceptId {
  return value === 'b' || value === 'c' ? value : 'a';
}

/**
 * Dev-only preview of the three UI concepts (mock data, no auth, no API).
 * /concepts/a?scheme=light|dark&screen=home|course  (b, c likewise).
 * Extra query flags: full=1 (natural height, used for screenshots), controls=1|0, marker=1.
 */
export default function ConceptRoute() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  if (!__DEV__) return null;

  const id = toConceptId(params.id);
  const scheme: Scheme = params.scheme === 'dark' ? 'dark' : 'light';
  const screen: ConceptScreen = params.screen === 'course' ? 'course' : 'home';
  const hasControls = params.controls ? params.controls === '1' : !isWeb;

  return (
    <ConceptHost
      id={id}
      scheme={scheme}
      screen={screen}
      isFull={params.full === '1'}
      hasControls={hasControls}
      hasEndMarker={params.marker === '1'}
      onChange={(next) =>
        router.replace({
          pathname: '/concepts/[id]',
          params: {
            id: next.id ?? id,
            scheme: next.scheme ?? scheme,
            screen: next.screen ?? screen,
            controls: '1',
          },
        })
      }
    />
  );
}
