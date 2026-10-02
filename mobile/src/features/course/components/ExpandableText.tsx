import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { STRINGS } from '@/constants/strings';
import { spacing } from '@/theme';

export type ExpandableTextProps = {
  text: string;
  /** Lines shown while collapsed. Default 4 (course / project description). */
  maxLines?: number;
};

/** Characters removed from the last visible line to make room for "...  See more". */
const TRIM_CHARS = 16;

/**
 * Paragraph clamped to `maxLines` with an inline "See more" link (design: Overview / Projects).
 * A hidden copy of the full text is measured with `onTextLayout` to know whether it overflows.
 */
export function ExpandableText({ text, maxLines = 4 }: ExpandableTextProps) {
  const [lines, setLines] = useState<readonly string[] | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMeasure = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const next = event.nativeEvent.lines.map((line) => line.text);
    setLines((prev) =>
      prev && prev.length === next.length && prev.join('') === next.join('') ? prev : next,
    );
  }, []);

  const isTruncatable = lines !== null && lines.length > maxLines;
  const collapsedText = useMemo(() => {
    if (!lines || lines.length <= maxLines) return text;
    const visible = lines.slice(0, maxLines).join('').trimEnd();
    return `${visible.slice(0, Math.max(0, visible.length - TRIM_CHARS)).trimEnd()}...`;
  }, [lines, maxLines, text]);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  return (
    <View>
      <AppText
        variant="bodyLarge"
        color="textSecondary"
        style={styles.measure}
        onTextLayout={handleMeasure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="expandable-text-measure"
      >
        {text}
      </AppText>
      <AppText
        variant="bodyLarge"
        color="textSecondary"
        numberOfLines={isExpanded ? undefined : maxLines}
      >
        {isExpanded || !isTruncatable ? text : collapsedText}
        {isTruncatable && !isExpanded ? (
          <AppText
            variant="body"
            color="primary"
            family="bodyMedium"
            accessibilityRole="link"
            onPress={expand}
          >
            {`  ${STRINGS.common.seeMore}`}
          </AppText>
        ) : null}
      </AppText>
      {isTruncatable && isExpanded ? (
        <AppText
          variant="body"
          color="primary"
          family="bodyMedium"
          accessibilityRole="link"
          onPress={collapse}
          style={styles.seeLess}
        >
          {STRINGS.common.seeLess}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  seeLess: { marginTop: spacing.xs, paddingVertical: spacing.sm, alignSelf: 'flex-start' },
});
