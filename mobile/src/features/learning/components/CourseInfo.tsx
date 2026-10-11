import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type CourseInfoProps = {
  title: string;
  /** Size of the title: `h2` (default, phone) or the smaller `title` (under the PC lesson heading). */
  titleVariant?: 'h2' | 'title';
  likeCount: number;
  shareCount: number;
  isLiked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
};

/**
 * Under the video: the course title in serif and two outlined pills, "♡ 231 Likes" and
 * "Share 16" (the heart turns red when liked). Each pill is 40 dp tall with a 48 dp touch target.
 */
function CourseInfoBase({
  title,
  titleVariant = 'h2',
  likeCount,
  shareCount,
  isLiked,
  onToggleLike,
  onShare,
}: CourseInfoProps) {
  const { t } = useTranslation('learning');
  const { colors } = useTheme();
  const styles = useStyles();
  const likeLabel = t('likes', { count: likeCount });
  const shareLabel = t('shares', { count: shareCount });
  return (
    <View style={styles.container}>
      <AppText variant={titleVariant} numberOfLines={3} accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.row}>
        <Pressable
          onPress={onToggleLike}
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${isLiked ? t('unlikeCourse') : t('likeCourse')}, ${likeCount}`}
          accessibilityState={{ selected: isLiked }}
          style={({ pressed }) => [
            styles.pill,
            isLiked ? styles.pillLiked : null,
            pressed ? styles.pressed : null,
          ]}
          testID="course-like"
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? colors.danger : colors.textMuted}
          />
          <AppText variant="label">{likeLabel}</AppText>
        </Pressable>
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('shareCourse')}, ${shareCount}`}
          style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
          testID="course-share"
        >
          <Feather name="share-2" size={20} color={colors.textMuted} />
          <AppText variant="label">{shareLabel}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.md },
  // `flexWrap`: with a large system font the two pills no longer fit side by side.
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  pill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  pillLiked: { borderColor: t.colors.danger, backgroundColor: t.colors.dangerSoft },
  pressed: { opacity: 0.7 },
}));

export const CourseInfo = memo(CourseInfoBase);
