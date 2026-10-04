import { useLocalSearchParams } from 'expo-router';

import { UiKitPreview } from '@/components/dev/UiKitPreview';
import type { ThemeMode } from '@/stores/preferencesStore';

type Params = { scheme?: string; lang?: string; full?: string; toast?: string; tab?: string };

function toScheme(value: string | undefined): ThemeMode | undefined {
  return value === 'light' || value === 'dark' ? value : undefined;
}

/**
 * Dev-only kitchen sink of the UI kit: `/dev/ui-kit?scheme=light|dark&lang=vi|en&full=1&toast=1&tab=0..3`.
 * Renders nothing in a production build.
 */
export default function UiKitRoute() {
  const params = useLocalSearchParams<Params>();
  if (!__DEV__) return null;
  return (
    <UiKitPreview
      scheme={toScheme(params.scheme)}
      language={params.lang === 'vi' || params.lang === 'en' ? params.lang : undefined}
      isFull={params.full === '1'}
      hasToast={params.toast === '1'}
      activeTab={Number(params.tab) || 0}
    />
  );
}
