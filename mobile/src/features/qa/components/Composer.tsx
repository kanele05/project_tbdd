import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { fontFamily, layout, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

import { QA_MAX_LENGTH, QUICK_EMOJIS } from '../config';

export type ComposerProps = {
  placeholder: string;
  /**
   * Sends the text. Must reject when it failed (the text is kept so the user can retry; the
   * mutation hooks already toast the error).
   */
  onSubmit: (content: string) => Promise<unknown>;
};

const AVATAR_SIZE = 40;
const SEND_SIZE = 40;

/**
 * Bottom composer of SC-15 Q&A and SC-16: the user's avatar, a row of quick emoji (tap to insert),
 * a pill input and a round neon send button. BR-09: 1-1000 characters.
 */
export function Composer({ placeholder, onSubmit }: ComposerProps) {
  const { t } = useTranslation('qa');
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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
      <Avatar uri={user?.avatarUrl} name={user?.fullName} size={AVATAR_SIZE} hasRing />
      <View style={styles.main}>
        <View style={styles.emojis}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              accessibilityRole="button"
              accessibilityLabel={t('insertEmoji', { emoji })}
              style={styles.emojiButton}
            >
              <AppText variant="body">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={[styles.inputWrap, isFocused ? styles.inputFocused : null]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            accessibilityLabel={placeholder}
            multiline
            numberOfLines={1}
            maxLength={QA_MAX_LENGTH}
            style={styles.input}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={t('send')}
            accessibilityState={{ disabled: !canSend, busy: isSending }}
            style={[styles.send, canSend ? styles.sendActive : styles.sendIdle]}
          >
            <Feather name="send" size={18} color={canSend ? colors.onPrimary : colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  main: { flex: 1, gap: spacing.xs },
  // Seven quick emoji next to the avatar: 48 dp tall and ~36 dp wide each (48 dp wide would
  // overflow a 360 dp phone); `flexWrap` keeps every emoji reachable on narrow screens.
  emojis: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  emojiButton: {
    minWidth: 36,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  inputFocused: { borderColor: t.colors.primaryText },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    color: t.colors.text,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: t.colors.primary },
  sendIdle: { backgroundColor: t.colors.border },
}));
