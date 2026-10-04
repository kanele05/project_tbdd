import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { ProjectSubmissionDto } from '@/types/api';

export type ProjectCardProps = { submission: ProjectSubmissionDto };

export const PROJECT_CARD_WIDTH = 164;
const IMAGE_HEIGHT = 84;
/** Card height with a one-line title and author: 1 + 12 + 84 + 12 + 21 + 4 + 19 + 12 + 1. */
export const PROJECT_CARD_HEIGHT = 166;

/** A student project in the horizontal list: cover image, title, author. */
function ProjectCardBase({ submission }: ProjectCardProps) {
  const { t } = useTranslation('project');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={t('projectCard', {
        title: submission.title,
        author: submission.user.fullName,
      })}
    >
      <View style={styles.imageWrap}>
        {submission.imageUrl ? (
          <Image
            source={{ uri: submission.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={submission.id}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={24} color={colors.iconMuted} />
        )}
      </View>
      <View style={styles.texts}>
        <AppText variant="cardTitle" numberOfLines={1}>
          {submission.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {submission.user.fullName}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    width: PROJECT_CARD_WIDTH,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  imageWrap: {
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  texts: { gap: spacing.xs },
}));

export const ProjectCard = memo(ProjectCardBase);
