import type { StyleProp, ViewStyle } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';

/** "Created by AI" tag: shown on every piece of AI-generated content (summary, quiz). */
export function AiBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation('ai');
  return <Badge label={t('poweredBy')} tone="secondary" shape="pill" style={style} />;
}
