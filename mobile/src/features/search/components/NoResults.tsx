import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { TagDto } from '@/types/api';

import { useHotTags } from '../hooks';
import { HotTopics } from './HotTopics';

/** "No courses found" + hot-topic suggestions (PLAN.md SC-06). */
export function NoResults({ onPressTag }: { onPressTag: (tag: TagDto) => void }) {
  const { t } = useTranslation('search');
  const { data: tags } = useHotTags();
  return (
    <View style={styles.empty}>
      <EmptyState icon="search" title={t('empty.title')} message={t('empty.message')} />
      {tags && tags.length > 0 ? (
        <View style={styles.suggestions}>
          <HotTopics tags={tags} onPressTag={onPressTag} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { gap: spacing.sm },
  suggestions: { paddingHorizontal: layout.screenPaddingX },
});
