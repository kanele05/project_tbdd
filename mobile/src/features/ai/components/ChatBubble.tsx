import { memo, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useTranslation } from '@/i18n';
import { fontFamily, makeStyles, radius, spacing, useTheme } from '@/theme';

import { parseTutorText, toPlainText, type TextSegment } from '../tutorText';

export type ChatBubbleProps = {
  role: 'user' | 'assistant';
  text: string;
  /** Assistant only: the answer is still arriving (typing indicator / cursor). */
  isStreaming?: boolean;
  testID?: string;
};

const ORB_SIZE = 28;

function Segments({ segments }: { segments: TextSegment[] }) {
  const styles = useStyles();
  return (
    <>
      {segments.map((segment, index) => (
        <AppText
          key={`${index}-${segment.style}`}
          variant="body"
          style={
            segment.style === 'bold'
              ? styles.bold
              : segment.style === 'code'
                ? styles.code
                : undefined
          }
        >
          {segment.text}
        </AppText>
      ))}
    </>
  );
}

/**
 * One chat message. The assistant's reply is a card with the neon orb (light Markdown rendered as
 * styled text); the user's message is a tinted bubble on the right. The screen reader gets the
 * plain text under one label ("AI Tutor said: ..."), not the individual styled pieces.
 */
function ChatBubbleBase({ role, text, isStreaming = false, testID }: ChatBubbleProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  const isUser = role === 'user';
  const blocks = useMemo(() => parseTutorText(text), [text]);
  const label = t(isUser ? 'tutor.youSaid' : 'tutor.assistantSaid', { text: toPlainText(text) });
  // While the answer arrives its label stays "AI Tutor is writing...": a label (and live region) that
  // changed with every chunk would make TalkBack re-read the growing text over and over. The finished
  // answer is announced once.
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (!isUser && wasStreaming.current && !isStreaming && text !== '') {
      AccessibilityInfo.announceForAccessibility(label);
    }
    wasStreaming.current = isStreaming;
  }, [isUser, isStreaming, text, label]);

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]} testID={testID}>
        <View style={styles.userBubble} accessible accessibilityLabel={label}>
          <AppText variant="body">{text}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.orb} importantForAccessibility="no-hide-descendants">
        <SparklesIcon size={16} color={colors.onPrimary} />
      </View>
      <View
        style={styles.assistantBubble}
        accessible
        accessibilityLabel={isStreaming ? t('tutor.typing') : label}
        accessibilityLiveRegion={isStreaming ? 'polite' : 'none'}
      >
        {blocks.length === 0 && isStreaming ? (
          <View style={styles.typing} accessibilityLabel={t('tutor.typing')}>
            <ActivityIndicator size="small" color={colors.primaryText} />
            <AppText variant="caption" color="textMuted">
              {t('tutor.typing')}
            </AppText>
          </View>
        ) : (
          blocks.map((block, index) => {
            const isLast = index === blocks.length - 1;
            const cursor = isStreaming && isLast ? ' ▍' : '';
            return (
              <View key={index} style={block.kind === 'bullet' ? styles.bulletRow : undefined}>
                {block.kind === 'bullet' ? (
                  <AppText variant="body" color="primaryText">
                    {'•'}
                  </AppText>
                ) : null}
                <AppText variant="body" style={block.kind === 'heading' ? styles.bold : undefined}>
                  <Segments segments={block.segments} />
                  {cursor ? (
                    <AppText variant="body" color="primaryText">
                      {cursor}
                    </AppText>
                  ) : null}
                </AppText>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, maxWidth: '100%' },
  rowUser: { justifyContent: 'flex-end' },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    marginTop: spacing.xs,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
  },
  userBubble: {
    maxWidth: '85%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.badge,
    backgroundColor: t.colors.primarySoft,
    borderWidth: 1,
    borderColor: t.colors.primaryTrack,
  },
  assistantBubble: {
    flexShrink: 1,
    maxWidth: '88%',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.badge,
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm },
  bold: { fontFamily: fontFamily.bodyBold },
  code: {
    fontFamily: fontFamily.bodyMedium,
    color: t.colors.primaryText,
    backgroundColor: t.colors.surface,
  },
}));

export const ChatBubble = memo(ChatBubbleBase);
