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
import { Icon, type IconName } from '../shared/icons';
import type { Scheme } from '../shared/types';

/**
 * Concept A "Spark": energetic cyan + violet, chunky tactile shapes (a solid "ledge" under every
 * card / button), rounded Nunito, gamification accents (flame orange, XP gold).
 */
export type PaletteA = {
  bg: string;
  card: string;
  cardBorder: string;
  cardLedge: string;
  text: string;
  muted: string;
  track: string;
  primary: string;
  primaryLedge: string;
  onPrimary: string;
  primaryText: string;
  primaryTint: string;
  purple: string;
  purpleLedge: string;
  purpleText: string;
  purpleTint: string;
  orange: string;
  orangeText: string;
  orangeTint: string;
  gold: string;
  goldLedge: string;
  goldText: string;
  goldTint: string;
  onGold: string;
  green: string;
  greenText: string;
  greenTint: string;
  pink: string;
  pinkText: string;
  pinkTint: string;
  blue: string;
  blueText: string;
  blueTint: string;
  tabBg: string;
};

const LIGHT: PaletteA = {
  bg: '#F4F2FF',
  card: '#FFFFFF',
  cardBorder: '#E3DDFA',
  cardLedge: '#D3C9F3',
  text: '#1B1646',
  muted: '#59538A',
  track: '#E6E0FA',
  primary: '#00BDD6',
  primaryLedge: '#0094A8',
  onPrimary: '#06283A',
  primaryText: '#00727F',
  primaryTint: '#E0F9FD',
  purple: '#7B4DE8',
  purpleLedge: '#5A33C0',
  purpleText: '#6336BE',
  purpleTint: '#ECE6FF',
  orange: '#FF8A1F',
  orangeText: '#A64B00',
  orangeTint: '#FFF0DC',
  gold: '#FFC53D',
  goldLedge: '#D99A00',
  goldText: '#8A5A00',
  goldTint: '#FFF5D6',
  onGold: '#3D2700',
  green: '#2FBF71',
  greenText: '#146C43',
  greenTint: '#DDF7E9',
  pink: '#E11D63',
  pinkText: '#B10F4A',
  pinkTint: '#FFE3EC',
  blue: '#4069E5',
  blueText: '#2B4FC4',
  blueTint: '#E4EAFF',
  tabBg: '#FFFFFF',
};

const DARK: PaletteA = {
  bg: '#0E0B24',
  card: '#1A1640',
  cardBorder: '#2C2763',
  cardLedge: '#0A0820',
  text: '#F4F2FF',
  muted: '#B9B4E6',
  track: '#2C2763',
  primary: '#19D3EC',
  primaryLedge: '#0096AA',
  onPrimary: '#04222E',
  primaryText: '#4FE3F7',
  primaryTint: '#0D3A4F',
  purple: '#7B4DE8',
  purpleLedge: '#4A27A8',
  purpleText: '#B79BFF',
  purpleTint: '#2E2470',
  orange: '#FF8A1F',
  orangeText: '#FFA94D',
  orangeTint: '#4A2A14',
  gold: '#FFC53D',
  goldLedge: '#C98F00',
  goldText: '#FFD36B',
  goldTint: '#43330F',
  onGold: '#3D2700',
  green: '#2FBF71',
  greenText: '#4ADE9A',
  greenTint: '#0F3D2B',
  pink: '#E11D63',
  pinkText: '#FF8FB0',
  pinkTint: '#4A1431',
  blue: '#4069E5',
  blueText: '#9DB4FF',
  blueTint: '#1C2866',
  tabBg: '#15112F',
};

export const PALETTES_A: Record<Scheme, PaletteA> = { light: LIGHT, dark: DARK };

export function usePaletteA(): PaletteA {
  return PALETTES_A[useConceptEnv().scheme];
}

export const FONT_A = {
  black: 'Nunito_900Black',
  heavy: 'Nunito_800ExtraBold',
  bold: 'Nunito_700Bold',
  semi: 'Nunito_600SemiBold',
} as const;

type Variant = 'display' | 'title' | 'h3' | 'body' | 'small' | 'tiny';
type ColorKey = keyof PaletteA | 'white' | 'whiteSoft';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: FONT_A.black, fontSize: 28, lineHeight: 33 },
  title: { fontFamily: FONT_A.black, fontSize: 21, lineHeight: 27 },
  h3: { fontFamily: FONT_A.heavy, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: FONT_A.semi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: FONT_A.bold, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: FONT_A.heavy, fontSize: 12, lineHeight: 16 },
};

type TProps = {
  v?: Variant;
  color?: ColorKey;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
};

/** Themed text for concept A. */
export function T({ v = 'body', color = 'text', children, style, numberOfLines, align }: TProps) {
  const p = usePaletteA();
  const resolved =
    color === 'white' ? '#FFFFFF' : color === 'whiteSoft' ? 'rgba(255,255,255,0.92)' : p[color];
  return (
    <Text
      style={[VARIANTS[v], { color: resolved }, align ? { textAlign: align } : null, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

type CardProps = { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'card' | 'plain' };

/** Chunky card: 2 px outline plus a thicker "ledge" at the bottom. */
export function Card({ children, style }: CardProps) {
  const p = usePaletteA();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.card, borderColor: p.cardBorder, borderBottomColor: p.cardLedge },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type Tone = 'primary' | 'purple' | 'gold' | 'white' | 'soft';

type ChunkProps = {
  label: string;
  tone?: Tone;
  icon?: IconName;
  iconFill?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  compact?: boolean;
};

/** Duolingo-style pressable button: sinks 3 px on press. Min height 52 (48 when compact). */
export function Chunk({
  label,
  tone = 'primary',
  icon,
  iconFill,
  onPress,
  style,
  accessibilityLabel,
  compact,
}: ChunkProps) {
  const p = usePaletteA();
  const palette: Record<Tone, { bg: string; ledge: string; fg: string }> = {
    primary: { bg: p.primary, ledge: p.primaryLedge, fg: p.onPrimary },
    purple: { bg: p.purple, ledge: p.purpleLedge, fg: '#FFFFFF' },
    gold: { bg: p.gold, ledge: p.goldLedge, fg: p.onGold },
    white: { bg: '#FFFFFF', ledge: '#CFC4F5', fg: '#4A27A8' },
    soft: { bg: p.primaryTint, ledge: p.cardBorder, fg: p.primaryText },
  };
  const c = palette[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chunk,
        { minHeight: compact ? 48 : 52, backgroundColor: c.bg, borderBottomColor: c.ledge },
        pressed ? styles.chunkPressed : null,
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={20}
          color={c.fg}
          strokeWidth={2.4}
          fill={iconFill ? c.fg : undefined}
        />
      ) : null}
      <Text style={[styles.chunkLabel, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

type IconButtonProps = {
  name: IconName;
  label: string;
  color?: string;
  fill?: string;
  style?: StyleProp<ViewStyle>;
  badge?: boolean;
};

/** 48 dp round icon button in the chunky style. */
export function IconBtn({ name, label, color, fill, style, badge }: IconButtonProps) {
  const p = usePaletteA();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: p.card, borderColor: p.cardBorder, borderBottomColor: p.cardLedge },
        pressed ? styles.chunkPressed : null,
        style,
      ]}
    >
      <Icon name={name} size={22} color={color ?? p.text} fill={fill} />
      {badge ? (
        <View style={[styles.dot, { backgroundColor: p.pink, borderColor: p.card }]} />
      ) : null}
    </Pressable>
  );
}

type SectionProps = { title: string; action?: string; children: ReactNode };

/** Section with title + "Xem tất cả" link. */
export function Section({ title, action = 'Xem tất cả', children }: SectionProps) {
  const p = usePaletteA();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <T v="title">{title}</T>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={styles.sectionLink}
        >
          <T v="small" color="primaryText">
            {action}
          </T>
          <Icon name="chevronRight" size={16} color={p.primaryText} strokeWidth={2.6} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export const SCREEN_PAD = 20;

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 2, borderBottomWidth: 5 },
  chunk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderBottomWidth: 5,
  },
  chunkPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
  chunkLabel: { fontFamily: FONT_A.black, fontSize: 16, lineHeight: 21, letterSpacing: 0.2 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 11,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PAD,
    marginBottom: 14,
  },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
});
