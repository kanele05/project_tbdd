import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import { photoUrl } from './mock';

type PhotoProps = {
  /** Unsplash photo id (see `PHOTO`) or a full https URL (portraits). */
  source: string;
  /** Requested width in px (Unsplash resizes server-side). */
  width?: number;
  style?: StyleProp<ImageStyle>;
  /** Shown while the picture loads. */
  placeholderColor?: string;
  /** Decorative by default; pass a label when the picture carries meaning. */
  label?: string;
  position?: 'top' | 'center' | 'bottom';
};

/** Cached remote picture (expo-image, memory-disk) that fills its box. */
export function Photo({
  source,
  width = 600,
  style,
  placeholderColor = '#2A2A38',
  label,
  position = 'center',
}: PhotoProps) {
  const uri = source.startsWith('http') ? source : photoUrl(source, width);
  return (
    <Image
      source={{ uri }}
      style={[styles.fill, { backgroundColor: placeholderColor }, style]}
      contentFit="cover"
      contentPosition={position}
      cachePolicy="memory-disk"
      transition={200}
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
