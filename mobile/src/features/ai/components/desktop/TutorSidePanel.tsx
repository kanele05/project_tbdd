import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { WorkPanel, pointerStyle } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { TUTOR_SUGGESTION_KEYS } from '../../chatConfig';

export type TutorSidePanelProps = {
  courseTitle?: string;
  /** Once the chat has messages the quick questions move here (the empty chat lists them itself). */
  hasConversation: boolean;
  onAsk: (question: string) => void;
  isDisabled: boolean;
  onOpenCourse: () => void;
};

type QuestionRowProps = { label: string; isDisabled: boolean; onPress: () => void; testID: string };

function QuestionRow({ label, isDisabled, onPress, testID }: QuestionRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.row,
        isHovered && !isDisabled ? styles.rowHover : null,
        isDisabled ? styles.disabled : null,
      ]}
      testID={testID}
    >
      <AppText variant="body" style={styles.rowText}>
        {label}
      </AppText>
      <Feather name="arrow-up-right" size={18} color={colors.primaryText} />
    </Pressable>
  );
}

/** Right column of the PC AI Tutor: which course the answers come from, and quick questions. */
export function TutorSidePanel({
  courseTitle,
  hasConversation,
  onAsk,
  isDisabled,
  onOpenCourse,
}: TutorSidePanelProps) {
  const { t } = useTranslation('ai');
  const styles = useStyles();
  return (
    <>
      <WorkPanel title={t('tutor.side.course')} testID="tutor-side-course">
        {courseTitle ? <AppText variant="cardTitle">{courseTitle}</AppText> : null}
        <AppText variant="caption">{t('tutor.side.hint')}</AppText>
        <Button
          title={t('tutor.side.openCourse')}
          variant="secondary"
          size="sm"
          leftIcon="book-open"
          onPress={onOpenCourse}
          testID="tutor-side-open-course"
        />
      </WorkPanel>
      {hasConversation ? (
        <WorkPanel title={t('tutor.side.try')} testID="tutor-side-questions">
          <View style={styles.list}>
            {TUTOR_SUGGESTION_KEYS.map((key) => {
              const question = t(`tutor.suggestions.${key}`);
              return (
                <QuestionRow
                  key={key}
                  label={question}
                  isDisabled={isDisabled}
                  onPress={() => onAsk(question)}
                  testID={`tutor-side-suggestion-${key}`}
                />
              );
            })}
          </View>
        </WorkPanel>
      ) : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.sm },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...pointerStyle,
  },
  rowHover: { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.primaryText },
  rowText: { flex: 1 },
  disabled: { opacity: 0.5 },
}));
