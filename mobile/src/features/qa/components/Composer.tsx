import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

import { QA_MAX_LENGTH, QA_STRINGS, QUICK_EMOJIS } from '../strings';

export type ComposerProps = {
  placeholder: string;
  /**
   * Sends the text. Must reject when it failed (the text is kept so the user can retry; the
   * mutation hooks already toast the error).
   */
  onSubmit: (content: string) => Promise<unknown>;
};

/**
 * Bottom composer of SC-15 Q&A and SC-16: the user's avatar, a row of quick emoji (tap to insert),
 * the input and a send button. BR-09: 1-1000 characters.
 */
export function Composer({ placeholder, onSubmit }: ComposerProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const canSend = text.trim().length > 0 && !isSending;

  const insertEmoji = (emoji: string) => {
    setText((previous) =>
      previous.length + emoji.length > QA_MAX_LENGTH ? previous : previous + emoji,
    );
  };

  const send = async () => {
    const content = text.trim();
    if (!content || isSending) return;
    setIsSending(true);
    try {
      await onSubmit(content);
      setText('');
    } catch {
      // Keep the text; the failure was already reported by the mutation.
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <Avatar uri={user?.avatarUrl} name={user?.fullName} size={40} />
      <View style={styles.main}>
        <View style={styles.emojis}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${emoji}`}
              style={styles.emoji}
            >
              <AppText variant="bodyLarge">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={placeholder}
            multiline
            maxLength={QA_MAX_LENGTH}
            style={styles.input}
          />
          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={QA_STRINGS.send}
            accessibilityState={{ disabled: !canSend, busy: isSending }}
            style={styles.send}
          >
            <Feather name="send" size={20} color={canSend ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  main: { flex: 1, gap: spacing.xs },
  emojis: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  emoji: { paddingHorizontal: spacing.xs },
  inputWrap: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
  },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
