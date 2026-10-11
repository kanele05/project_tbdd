import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

export type SheetModalProps = {
  isVisible: boolean;
  title: string;
  /** One line under the title (who / what the sheet is about). */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
};

/**
 * Bottom sheet for the short forms of the teacher tools (reply to a review, grade a project): a
 * dimmed backdrop, a card with the title and a close button, and the form below. The Android back
 * button, the backdrop and the close button all call `onClose`. The sheet is centered and capped at
 * the app's content width on wide screens (web / tablet).
 */
export function SheetModal({
  isVisible,
  title,
  subtitle,
  onClose,
  children,
  testID,
}: SheetModalProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('actions.close')}
          testID="sheet-backdrop"
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          accessibilityViewIsModal
          testID={testID}
        >
          <View style={styles.header}>
            <View style={styles.titles}>
              <AppText variant="h3" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" numberOfLines={2}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="x" onPress={onClose} accessibilityLabel={t('actions.close')} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    maxHeight: '90%',
    alignSelf: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titles: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  body: { gap: spacing.lg, paddingTop: spacing.lg },
}));
