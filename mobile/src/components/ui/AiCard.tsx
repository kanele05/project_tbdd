import Feather from '@expo/vector-icons/Feather';
import { memo, useId, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

export type AiCardProps = {
  /** "AI Tutor". Rendered in the italic serif. */
  title: string;
  subtitle?: string;
  /**
   * `panel` = large block with room for children (suggestion text, prompt field, quick prompts).
   * `row`   = compact one-line entry; give it `onPress` (e.g. "Ask the AI Tutor about this course").
   */
  variant?: 'panel' | 'row';
  /** Makes the whole card pressable (use with `row`; a `panel` with children keeps its own controls). */
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Sparkles glyph (Feather has none): the mark of every AI entry point. */
function Sparkles({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 3v4M22 5h-4M4 17v2M5 18H3"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * The AI block of concept B: a card with a hairline, a violet glow top-right and a neon glow
 * bottom-left, a neon orb with the sparkles glyph and an italic serif title. All text sits on the
 * `card` fill (the glows are faint tints), so contrast is the same as on any card.
 */
function AiCardBase({
  title,
  subtitle,
  variant = 'panel',
  onPress,
  children,
  style,
  testID,
}: AiCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const isRow = variant === 'row';
  // SVG gradient ids are global on web: make them unique per card.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const violetId = `aiViolet${uid}`;
  const neonId = `aiNeon${uid}`;
  const orbSize = isRow ? 44 : 48;

  const body = (
    <>
      <Svg width="100%" height="100%" style={styles.glowLayer}>
        <Defs>
          <RadialGradient id={violetId} cx="95%" cy="0%" rx="75%" ry="70%">
            <Stop offset="0" stopColor={colors.secondary} stopOpacity={isDark ? 0.5 : 0.18} />
            <Stop offset="1" stopColor={colors.secondary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={neonId} cx="0%" cy="100%" rx="70%" ry="60%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={isDark ? 0.22 : 0.3} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${violetId})`} />
        <Rect width="100%" height="100%" fill={`url(#${neonId})`} />
      </Svg>
      <View style={styles.head}>
        <View
          style={[
            styles.orb,
            { width: orbSize, height: orbSize, borderRadius: orbSize / 2 },
            { backgroundColor: colors.primary },
          ]}
        >
          <Sparkles size={isRow ? 20 : 24} color={colors.onPrimary} />
        </View>
        <View style={styles.headText}>
          <AppText
            variant={isRow ? 'title' : 'h2'}
            family={isRow ? 'heading' : 'displayItalic'}
            accessibilityRole="header"
            numberOfLines={isRow ? 2 : undefined}
          >
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="textMuted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {isRow ? <Feather name="arrow-right" size={20} color={colors.primaryText} /> : null}
      </View>
      {children}
    </>
  );

  const cardStyle = [styles.card, isRow ? styles.cardRow : styles.cardPanel, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        testID={testID}
        style={({ pressed }) => [cardStyle, pressed ? styles.pressed : null]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View style={cardStyle} testID={testID}>
      {body}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  cardPanel: { borderRadius: radius.xl, padding: spacing.lg + 2, gap: spacing.md + 2 },
  cardRow: { borderRadius: radius.lg, padding: spacing.md + 2, gap: spacing.md },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1 },
  orb: { alignItems: 'center', justifyContent: 'center' },
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
}));

export const AiCard = memo(AiCardBase);
