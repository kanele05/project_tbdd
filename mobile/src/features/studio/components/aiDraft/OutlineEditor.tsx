import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import {
  removeLesson,
  removeSection,
  setLessonTitle,
  setSectionTitle,
  type AiOutline,
} from '../../aiDraftOutline';
import { STUDIO_LIMITS } from '../../limits';

export type OutlineEditorProps = {
  sections: AiOutline;
  onChange: (sections: AiOutline) => void;
};

/** The AI outline with editable titles; a section or a lesson can be removed before applying. */
export function OutlineEditor({ sections, onChange }: OutlineEditorProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  if (sections.length === 0) {
    return <AppText variant="caption">{t('ai.outline.empty')}</AppText>;
  }
  return (
    <View style={styles.list}>
      {sections.map((section, index) => (
        <View key={index} style={styles.section} testID={`ai-outline-section-${index}`}>
          <View style={styles.row}>
            <TextField
              containerStyle={styles.input}
              value={section.title}
              onChangeText={(text) => onChange(setSectionTitle(sections, index, text))}
              accessibilityLabel={t('ai.outline.sectionLabel', { number: index + 1 })}
              maxLength={STUDIO_LIMITS.sectionTitleMax}
            />
            <IconButton
              icon="trash-2"
              color="dangerText"
              onPress={() => onChange(removeSection(sections, index))}
              accessibilityLabel={t('ai.outline.removeSection', { number: index + 1 })}
            />
          </View>
          {section.lessons.map((lesson, lessonIndex) => (
            <View key={lessonIndex} style={[styles.row, styles.lesson]}>
              <TextField
                containerStyle={styles.input}
                value={lesson.title}
                onChangeText={(text) =>
                  onChange(setLessonTitle(sections, index, lessonIndex, text))
                }
                accessibilityLabel={t('ai.outline.lessonLabel', {
                  section: index + 1,
                  number: lessonIndex + 1,
                })}
                maxLength={STUDIO_LIMITS.lessonTitleMax}
              />
              <IconButton
                icon="x"
                color="textMuted"
                onPress={() => onChange(removeLesson(sections, index, lessonIndex))}
                accessibilityLabel={t('ai.outline.removeLesson', {
                  section: index + 1,
                  number: lessonIndex + 1,
                })}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  list: { gap: spacing.md },
  section: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lesson: { marginLeft: spacing.lg },
  input: { flex: 1 },
}));
