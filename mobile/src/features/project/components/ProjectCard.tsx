import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ProjectSubmissionDto } from '@/types/api';

export type ProjectCardProps = { submission: ProjectSubmissionDto };

export const PROJECT_CARD_WIDTH = 154;
const IMAGE_HEIGHT = 68;
/** Card height in the design with a one-line author: 1 + 12 + 68 + 12 + 20 + 4 + 20 + 12 + 1. */
export const PROJECT_CARD_HEIGHT = 150;

/** A student project in the horizontal list: cover image, title, author. */
function ProjectCardBase({ submission }: ProjectCardProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${submission.title}, by ${submission.user.fullName}`}
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
      <AppText variant="body" numberOfLines={1} style={styles.title}>
        {submission.title}
      </AppText>
      <AppText variant="caption" numberOfLines={1} style={styles.author}>
        {submission.user.fullName}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: PROJECT_CARD_WIDTH,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  imageWrap: {
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.badge,
    backgroundColor: colors.surface,
  },
  title: { marginTop: spacing.md, marginBottom: spacing.xs },
  // Design: the author line has a 20 dp pitch (the `caption` token is 16).
  author: { lineHeight: 20 },
});

export const ProjectCard = memo(ProjectCardBase);
