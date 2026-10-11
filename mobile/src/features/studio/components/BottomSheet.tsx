import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

export type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
};

/**
 * Modal sheet that slides up from the bottom (centered card on wide web windows) with a title, a
 * close button and a scrollable body. Tapping the dim area or the system Back closes it. The
 * keyboard pushes the sheet up so the focused field stays visible.
 */
export function BottomSheet({ visible, title, onClose, children, testID }: BottomSheetProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel={t('actions.close')}
          accessibilityRole="button"
        />
        <View style={styles.sheet} testID={testID}>
          <View style={styles.header}>
            <AppText variant="h3" style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {title}
            </AppText>
            <IconButton icon="x" onPress={onClose} accessibilityLabel={t('actions.close')} />
          </View>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  fill: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: t.colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: t.colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingLeft: layout.screenPaddingX,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
  },
  title: { flex: 1 },
  body: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm, gap: spacing.lg },
}));
