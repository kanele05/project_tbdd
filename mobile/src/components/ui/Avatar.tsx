import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

export type AvatarProps = {
  uri?: string | null;
  /** Used for the initials fallback and the screen-reader label. */
  name?: string;
  size?: number;
  /** Background behind the initials / transparent image. `secondaryLight` per design. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** First letters of the first and last word: "Sara Weise" -> "SW". */
export function getInitials(name?: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

/** Round avatar: cached remote image, or initials on a light purple circle. */
function AvatarBase({
  uri,
  name,
  size = 40,
  backgroundColor = colors.secondaryLight,
  style,
}: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2, backgroundColor };
  return (
    <View
      style={[styles.container, dimension, style]}
      accessible={Boolean(name)}
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s avatar` : undefined}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={uri}
        />
      ) : (
        <AppText
          variant="label"
          color="secondary"
          style={{ fontSize: Math.max(10, Math.round(size * 0.36)), lineHeight: undefined }}
        >
          {getInitials(name) || '?'}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export const Avatar = memo(AvatarBase);
