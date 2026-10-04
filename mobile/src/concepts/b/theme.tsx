import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useConceptEnv } from '../shared/env';
import { Glass } from '../shared/Glass';
import { Icon, type IconName } from '../shared/icons';
import type { Scheme } from '../shared/types';

/**
 * Concept B "Noir": cinematic, dark-first. Edge-to-edge photography, Playfair Display headlines,
 * one neon accent (cyan) and champagne gold for ratings / price promos. The light variant is a
 * warm "paper" magazine look that keeps the same structure.
 */
export type PaletteB = {
  isDark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  hairline: string;
  text: string;
  muted: string;
  /** Neon fill (buttons, active states). Text on it is `onNeon`. */
  neon: string;
  onNeon: string;
  /** Accent used as TEXT / thin lines on `bg` and `surface`. */
  accentText: string;
  /** Gold used as text. */
  goldText: string;
  gold: string;
  /** Last colour of the dark scrim at the bottom of a hero photo. */
  scrimEnd: string;
  rankStroke: string;
  glowViolet: string;
};

const DARK: PaletteB = {
  isDark: true,
  bg: '#08080C',
  surface: '#13131A',
  surface2: '#1C1C27',
  hairline: '#2A2A38',
  text: '#F6F2EA',
  muted: '#A9A7B8',
  neon: '#2EF2FF',
  onNeon: '#021417',
  accentText: '#2EF2FF',
  goldText: '#E9C77B',
  gold: '#E9C77B',
  scrimEnd: '#08080C',
  rankStroke: '#5C5C74',
  glowViolet: '#7C5CFF',
};

const LIGHT: PaletteB = {
  isDark: false,
  bg: '#F5F2EA',
  surface: '#FFFFFF',
  surface2: '#ECE7DB',
  hairline: '#D9D2C2',
  text: '#0D0D12',
  muted: '#5A5764',
  neon: '#00DCEB',
  onNeon: '#04161A',
  accentText: '#006B78',
  goldText: '#7A5A0B',
  gold: '#C9A24B',
  scrimEnd: '#0D0D12',
  rankStroke: '#A89F89',
  glowViolet: '#7C5CFF',
};

export const PALETTES_B: Record<Scheme, PaletteB> = { light: LIGHT, dark: DARK };

export function usePaletteB(): PaletteB {
  return PALETTES_B[useConceptEnv().scheme];
}

export const FONT_B = {
  serifBlack: 'PlayfairDisplay_900Black',
  serif: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_700Bold_Italic',
  body: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semi: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;

type Variant = 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
type ColorKey = 'text' | 'muted' | 'accentText' | 'goldText' | 'onNeon' | 'white' | 'whiteSoft';

const VARIANTS: Record<Variant, TextStyle> = {
  hero: {
    fontFamily: FONT_B.serifBlack,
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -0.4,
    fontVariant: ['lining-nums'],
  },
  h1: {
    fontFamily: FONT_B.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
    fontVariant: ['lining-nums'],
  },
  h2: { fontFamily: FONT_B.serif, fontSize: 22, lineHeight: 28, fontVariant: ['lining-nums'] },
  h3: { fontFamily: FONT_B.semi, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: FONT_B.body, fontSize: 15, lineHeight: 24 },
  small: { fontFamily: FONT_B.medium, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: FONT_B.semi, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
};

type TProps = {
  v?: Variant;
  color?: ColorKey;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
};

export function T({ v = 'body', color = 'text', children, style, numberOfLines, align }: TProps) {
  const p = usePaletteB();
  const map: Record<ColorKey, string> = {
    text: p.text,
    muted: p.muted,
    accentText: p.accentText,
    goldText: p.goldText,
    onNeon: p.onNeon,
    white: '#FFFFFF',
    whiteSoft: 'rgba(255,255,255,0.88)',
  };
  return (
    <Text
      style={[VARIANTS[v], { color: map[color] }, align ? { textAlign: align } : null, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

type NeonButtonProps = {
  label: string;
  icon?: IconName;
  iconFill?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Primary call to action: neon pill, dark label, 52 dp tall. */
export function NeonButton({ label, icon, iconFill, style, accessibilityLabel }: NeonButtonProps) {
  const p = usePaletteB();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.neon,
        {
          backgroundColor: p.neon,
          boxShadow: p.isDark ? '0 0 24px rgba(46,242,255,0.35)' : undefined,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={20}
          color={p.onNeon}
          fill={iconFill ? p.onNeon : undefined}
          strokeWidth={2.4}
        />
      ) : null}
      <Text style={[styles.neonLabel, { color: p.onNeon }]}>{label}</Text>
    </Pressable>
  );
}

type GlassButtonProps = {
  icon: IconName;
  label: string;
  size?: number;
  iconColor?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round frosted button that sits on photography (always dark glass, white glyph). */
export function GlassButton({
  icon,
  label,
  size = 48,
  iconColor = '#FFFFFF',
  fill,
  style,
}: GlassButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={style}>
      <Glass
        intensity={30}
        tint="dark"
        fill="rgba(8,8,12,0.45)"
        borderColor="rgba(255,255,255,0.22)"
        radius={size / 2}
        contentStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon
          name={icon}
          size={Math.round(size * 0.46)}
          color={iconColor}
          fill={fill ? iconColor : undefined}
        />
      </Glass>
    </Pressable>
  );
}

type SectionProps = { title: string; action?: string; children: ReactNode; gap?: number };

export function Section({ title, action = 'Xem tất cả', children, gap = 32 }: SectionProps) {
  const p = usePaletteB();
  return (
    <View style={{ marginTop: gap }}>
      <View style={styles.sectionHead}>
        <T v="h2">{title}</T>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          style={styles.sectionLink}
        >
          <T v="small" color="accentText">
            {action}
          </T>
          <Icon name="arrowRight" size={16} color={p.accentText} strokeWidth={2.2} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export const PAD = 20;

const styles = StyleSheet.create({
  neon: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  neonLabel: { fontFamily: FONT_B.bold, fontSize: 15, lineHeight: 20 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    marginBottom: 14,
  },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
});
