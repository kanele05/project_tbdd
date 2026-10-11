import Feather from '@expo/vector-icons/Feather';
import { memo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatLessonDuration } from '@/utils/formatDuration';

import { isOpenableUrl } from '../adminMeta';
import type { PreviewLesson, PreviewSection } from '../courseContent';

export type CurriculumPreviewProps = { sections: readonly PreviewSection[] };

function LessonRow({ lesson, index }: { lesson: PreviewLesson; index: number }) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const canOpen = isOpenableUrl(lesson.videoUrl);
  const hasNotes = lesson.content.trim().length > 0;

  const openVideo = (): void => {
    Linking.openURL(lesson.videoUrl).catch(() =>
      showToast(t('detail.openVideoFailed'), { type: 'error' }),
    );
  };

  return (
    <View style={styles.lesson}>
      <View style={styles.lessonHead}>
        <AppText variant="label" color="textMuted" style={styles.index}>
          {index}
        </AppText>
        <View style={styles.lessonBody}>
          <AppText variant="body" numberOfLines={3}>
            {lesson.title}
          </AppText>
          <View style={styles.meta}>
            <AppText variant="caption" color="textSecondary">
              {formatLessonDuration(lesson.durationSec)}
            </AppText>
            {lesson.isPreview ? (
              <Badge label={t('detail.previewLesson')} tone="gold" shape="pill" />
            ) : null}
            {!canOpen ? <Badge label={t('detail.noVideo')} tone="danger" shape="pill" /> : null}
          </View>
        </View>
        {canOpen ? (
          <IconButton
            icon="external-link"
            size={20}
            color="primaryText"
            onPress={openVideo}
            accessibilityLabel={t('detail.openVideo', { title: lesson.title })}
          />
        ) : null}
      </View>
      {hasNotes ? (
        <>
          <Pressable
            onPress={() => setIsOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            accessibilityLabel={isOpen ? t('detail.hideNotes') : t('detail.showNotes')}
            style={styles.notesToggle}
          >
            <Feather
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primaryText}
            />
            <AppText variant="label" color="primaryText">
              {isOpen ? t('detail.hideNotes') : t('detail.showNotes')}
            </AppText>
          </Pressable>
          {isOpen ? (
            <AppText variant="body" color="textSecondary" style={styles.notes}>
              {lesson.content}
            </AppText>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Read-only curriculum (sections, lessons, preview flags, YouTube link, collapsible notes) for the review detail. */
function CurriculumPreviewBase({ sections }: CurriculumPreviewProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  if (sections.length === 0) {
    return (
      <AppText variant="body" color="textSecondary">
        {t('detail.noCurriculum')}
      </AppText>
    );
  }
  // Running lesson number at the start of each section (computed up front, no mutation while rendering).
  const offsets = sections.reduce<number[]>(
    (acc, section, index) => [...acc, (acc[index] ?? 0) + section.lessons.length],
    [0],
  );
  return (
    <View style={styles.container}>
      {sections.map((section, sectionIndex) => (
        <View key={section.key} style={styles.section}>
          <AppText variant="title" accessibilityRole="header" style={styles.sectionTitle}>
            {t('detail.sectionTitle', { index: sectionIndex + 1, title: section.title })}
          </AppText>
          {section.lessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.key}
              lesson={lesson}
              index={(offsets[sectionIndex] ?? 0) + lessonIndex + 1}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.md },
  section: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: spacing.md,
    backgroundColor: t.colors.surface,
  },
  lesson: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
  lessonHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  index: { width: 24, textAlign: 'center' },
  lessonBody: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    marginLeft: 36,
  },
  notes: { marginLeft: 36, paddingBottom: spacing.xs },
}));

export const CurriculumPreview = memo(CurriculumPreviewBase);
