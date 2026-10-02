import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { IconButton, ScreenHeader } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { colors, layout } from '@/theme';

export type CourseDetailHeaderProps = {
  /** `null` while the course is loading / failed: only the back button is shown. */
  isBookmarked: boolean | null;
  onToggleBookmark: () => void;
  onOpenMenu: () => void;
};

/** Header of SC-09: back, "Course details", bookmark toggle and the more menu. */
export function CourseDetailHeader({
  isBookmarked,
  onToggleBookmark,
  onOpenMenu,
}: CourseDetailHeaderProps) {
  const right =
    isBookmarked === null ? null : (
      <>
        <Pressable
          onPress={onToggleBookmark}
          accessibilityRole="button"
          accessibilityLabel={
            isBookmarked ? STRINGS.common.removeBookmark : STRINGS.common.bookmark
          }
          accessibilityState={{ selected: isBookmarked }}
          style={styles.bookmark}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isBookmarked ? colors.primary : colors.textPrimary}
          />
        </Pressable>
        <IconButton icon="more-vertical" onPress={onOpenMenu} accessibilityLabel="More options" />
      </>
    );

  return <ScreenHeader title="Course details" right={right} />;
}

const styles = StyleSheet.create({
  bookmark: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
