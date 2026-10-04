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
  // 8 dp between chips in a row and between rows (the 40 dp chips keep a 48 dp touch target).
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.sm },
});
