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
      <Avatar uri={user?.avatarUrl} name={user?.fullName} size={AVATAR_SIZE} />
      <View style={styles.main}>
        <View style={styles.emojis}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${emoji}`}
              style={styles.emojiButton}
            >
              <AppText variant="body">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
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
            <Feather name="send" size={18} color={canSend ? colors.primary : colors.iconMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Measured from the design: 44 dp avatar, 16 dp gap, 20 dp above the emoji row, 8 dp between the
// emoji and the 32 dp input (4 dp corners, 12 px text), a faint `surface` line on top.
const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    backgroundColor: colors.background,
  },
  main: { flex: 1, gap: spacing.sm },
  // Row of 7 quick emojis next to the avatar: 48 dp tall and ~36 dp wide each (48 dp wide would
  // overflow a 360 dp phone); `flexWrap` keeps every emoji reachable on narrow screens.
  emojis: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  emojiButton: {
    minWidth: 36,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    borderRadius: radius.badge,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: spacing.xs + spacing.xxs,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: typography.caption.fontSize,
  },
  send: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
