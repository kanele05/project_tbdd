import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, spacing, type ColorToken } from '@/theme';

export type ExpandableTextProps = {
  text: string;
  /** Lines shown while collapsed. Default 4 (course / project description). */
  maxLines?: number;
  /** Paragraph color. Default `textSecondary` (descriptions are the quieter body text). */
  color?: ColorToken;
};

/**
 * Paragraph clamped to `maxLines` with a "See more" / "See less" link (course / project description).
 * The link is its own `Pressable` under the paragraph (48 dp tall) instead of nested text, so it is
 * easy to hit and TalkBack / VoiceOver can focus it.
 * A hidden copy of the full text is measured with `onTextLayout` to know whether it overflows.
 */
export function ExpandableText({
  text,
  maxLines = 4,
  color = 'textSecondary',
}: ExpandableTextProps) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<readonly string[] | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMeasure = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const next = event.nativeEvent.lines.map((line) => line.text);
    setLines((prev) =>
      prev && prev.length === next.length && prev.join('') === next.join('') ? prev : next,
    );
  }, []);

  const isTruncatable = lines !== null && lines.length > maxLines;

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  return (
    <View>
      <AppText
        variant="bodyLarge"
        color={color}
        style={styles.measure}
        onTextLayout={handleMeasure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="expandable-text-measure"
      >
        {text}
      </AppText>
      <AppText variant="bodyLarge" color={color} numberOfLines={isExpanded ? undefined : maxLines}>
        {text}
      </AppText>
      {isTruncatable ? (
        <Pressable
          onPress={isExpanded ? collapse : expand}
          accessibilityRole="link"
          accessibilityState={{ expanded: isExpanded }}
          style={styles.toggle}
        >
          <AppText variant="caption" color="primaryText">
            {isExpanded ? t('actions.seeLess') : t('actions.seeMore')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  // 48 dp target; the negative margin keeps the visible gap to the paragraph at ~8 dp.
  toggle: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
  },
});
