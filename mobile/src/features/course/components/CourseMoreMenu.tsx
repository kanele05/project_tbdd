import Feather from '@expo/vector-icons/Feather';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, layout, radius, shadows, spacing } from '@/theme';

export type CourseMoreMenuProps = {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
};

/** The three-dots menu of the course header. For now it has a single entry: Share (SC-09). */
export function CourseMoreMenu({ visible, onClose, onShare }: CourseMoreMenuProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      >
        <View
          style={[
            styles.menu,
            shadows.floating,
            { top: insets.top + layout.headerHeight - spacing.sm },
          ]}
        >
          <Pressable
            onPress={onShare}
            accessibilityRole="menuitem"
            accessibilityLabel="Share course"
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
          >
            <Feather name="share-2" size={20} color={colors.textPrimary} />
            <AppText variant="body">Share</AppText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.transparent },
  menu: {
    position: 'absolute',
    right: spacing.lg,
    minWidth: 160,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  item: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.surface },
});
