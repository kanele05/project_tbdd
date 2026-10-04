import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

import { TUTOR_SUGGESTION_KEYS } from '../chatConfig';

export type TutorEmptyProps = {
  /** Sends a quick question as if the user had typed it. */
  onAsk: (question: string) => void;
  isDisabled: boolean;
};

const ORB_SIZE = 64;

/** First visit of the chat: the orb, an invitation and the quick questions as tappable rows. */
export function TutorEmpty({ onAsk, isDisabled }: TutorEmptyProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container} testID="tutor-empty">
      <View style={styles.orb} importantForAccessibility="no-hide-descendants">
        <SparklesIcon size={32} color={colors.onPrimary} />
      </View>
      <AppText variant="h2" family="displayItalic" align="center" accessibilityRole="header">
        {t('tutor.introTitle')}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {t('tutor.introMessage')}
      </AppText>
      <View style={styles.list} accessibilityLabel={t('tutor.suggestionsLabel')}>
        {TUTOR_SUGGESTION_KEYS.map((key) => {
          const question = t(`tutor.suggestions.${key}`);
          return (
            <Pressable
              key={key}
              onPress={() => onAsk(question)}
              disabled={isDisabled}
              accessibilityRole="button"
              accessibilityLabel={question}
              accessibilityState={{ disabled: isDisabled }}
              style={({ pressed }) => [
                styles.row,
                isDisabled ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
              testID={`tutor-suggestion-${key}`}
            >
              <AppText variant="body" style={styles.rowText}>
                {question}
              </AppText>
              <Feather name="arrow-up-right" size={18} color={colors.primaryText} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xxxl,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
  },
  list: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  row: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  rowText: { flex: 1 },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  disabled: { opacity: 0.5 },
}));
