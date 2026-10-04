import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

export type AvatarProps = {
  uri?: string | null;
  /** Used for the initials fallback and the screen-reader label. */
  name?: string;
  size?: number;
  /** Background behind the initials / transparent image. Default `secondarySoft`. */
  backgroundColor?: string;
  /** Neon ring around the avatar (teachers, the signed-in user). Drawn inside the `size`. */
  hasRing?: boolean;
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

/**
 * Round avatar: cached remote image, or initials on a soft violet circle (also when the image
 * fails to load); optional neon ring.
 */
function AvatarBase({
  uri,
  name,
  size = 40,
  backgroundColor,
  hasRing = false,
  style,
}: AvatarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // A remote photo that fails to load (404, offline, expired URL) falls back to the initials;
  // a different `uri` later is tried again because only the failed one is remembered.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const hasImage = Boolean(uri) && uri !== failedUri;
  const dimension = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backgroundColor ?? colors.secondarySoft,
  };
  const ring = hasRing ? { borderWidth: 2, borderColor: colors.primaryText, padding: 0 } : null;
  return (
    <View
      style={[styles.container, dimension, ring, style]}
      accessible={Boolean(name)}
      accessibilityRole="image"
      accessibilityLabel={name ? t('a11y.avatarOf', { name }) : undefined}
    >
      {hasImage && uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={uri}
          onError={() => setFailedUri(uri)}
          testID="avatar-image"
        />
      ) : (
        <AppText
          variant="label"
          color="secondaryText"
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
