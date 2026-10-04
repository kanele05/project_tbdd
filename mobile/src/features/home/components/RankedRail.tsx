import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { AppText, RailList } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { fontFamily, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseSummary } from '@/types/api';

const POSTER_WIDTH = 130;
const POSTER_HEIGHT = 190;
/** The big numeral is drawn behind the left edge of the poster. */
const NUMERAL_OVERLAP = 14;
const NUMERAL_FONT_SIZE = 176;
const NUMERAL_DIGIT_WIDTH = 84;
const MAX_ITEMS = 10;

type RankedPosterProps = {
  course: CourseSummary;
  rank: number;
  onPress: (course: CourseSummary) => void;
};

/** Outlined serif numeral ("1", "2"...) - decorative, the rank is in the card's label. */
function RankNumeral({ rank }: { rank: number }) {
  const { colors } = useTheme();
  const width = NUMERAL_DIGIT_WIDTH * String(rank).length;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={width} height={POSTER_HEIGHT + 6}>
        <SvgText
          x={width - 6}
          y={POSTER_HEIGHT - 12}
          textAnchor="end"
          fontFamily={fontFamily.displayBlack}
          fontSize={NUMERAL_FONT_SIZE}
          fill="none"
          stroke={colors.iconMuted}
          strokeWidth={3}
        >
          {String(rank)}
        </SvgText>
      </Svg>
    </View>
  );
}

/** Poster with a giant outlined rank number next to it ("Top" rail, concept B). */
const RankedPoster = memo(function RankedPoster({ course, rank, onPress }: RankedPosterProps) {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const { colors } = useTheme();
  const rating = formatNumber(course.ratingAvg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <Pressable
      onPress={() => onPress(course)}
      accessibilityRole="button"
      accessibilityLabel={t('ranked.label', {
        rank,
        title: course.title,
        teacher: course.teacher.fullName,
        rating,
      })}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
    >
      <RankNumeral rank={rank} />
      <View style={styles.poster}>
        <Image
          source={{ uri: course.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={course.id}
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.88)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.posterText}>
          <AppText variant="label" color="white" numberOfLines={3}>
            {course.title}
          </AppText>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.star} />
            <AppText variant="micro" color="white">
              {rating}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

type RankedRailProps = {
  title: string;
  courses: readonly CourseSummary[];
  onPressCourse: (course: CourseSummary) => void;
  onViewMore: () => void;
};

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

/** "Popular courses" as a ranked rail: the order of the server list is the ranking. */
export function RankedRail({ title, courses, onPressCourse, onViewMore }: RankedRailProps) {
  const renderItem = useCallback(
    (course: CourseSummary, index: number) => (
      <RankedPoster course={course} rank={index + 1} onPress={onPressCourse} />
    ),
    [onPressCourse],
  );
  return (
    <RailList
      title={title}
      onViewMore={onViewMore}
      data={courses.slice(0, MAX_ITEMS)}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      gap={spacing.sm}
    />
  );
}

const useStyles = makeStyles((t) => ({
  item: { flexDirection: 'row', alignItems: 'flex-end' },
  pressed: { opacity: 0.85 },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    marginLeft: -NUMERAL_OVERLAP,
    marginBottom: spacing.xs + 2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  posterText: { padding: spacing.sm + 2, gap: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
}));
