import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui';
import { spacing } from '@/theme';
import type { TagDto } from '@/types/api';

type HotTopicsProps = {
  tags: readonly TagDto[];
  onPressTag: (tag: TagDto) => void;
};

/** "Hot topics": outline chips that wrap onto several lines (SC-05). */
export function HotTopics({ tags, onPressTag }: HotTopicsProps) {
  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <Chip key={tag.id} label={tag.name} onPress={() => onPressTag(tag)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
