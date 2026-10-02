import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, shadows } from '@/theme';

export type CourseHeroProps = {
  imageUrl: string;
  /** Hides the play button when the course has no preview lesson. */
  canPlayPreview: boolean;
  onPlayPreview: () => void;
};

/** Artboard ratio of the purple banner in the design (375 x 243). */
const HERO_ASPECT_RATIO = 375 / 243;
const PLAY_SIZE = 48;

/** Purple banner (`secondary`) with the course image and a centered white play button. */
function CourseHeroBase({ imageUrl, canPlayPreview, onPlayPreview }: CourseHeroProps) {
  return (
    <View style={styles.hero}>
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        accessibilityIgnoresInvertColors
      />
      {canPlayPreview ? (
        <Pressable
          onPress={onPlayPreview}
          accessibilityRole="button"
          accessibilityLabel="Play course preview"
          hitSlop={8}
          style={({ pressed }) => [styles.play, shadows.card, pressed ? styles.pressed : null]}
        >
          <Ionicons name="play" size={22} color={colors.secondary} style={styles.playIcon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: HERO_ASPECT_RATIO,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  // The play glyph is optically centered ~2 dp to the right of its box.
  playIcon: { marginLeft: 2 },
});

export const CourseHero = memo(CourseHeroBase);
