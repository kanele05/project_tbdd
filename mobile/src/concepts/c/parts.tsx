import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FONT_C, PAD, T, usePaletteC } from './theme';
import { Glass } from '../shared/Glass';
import { Icon, type IconName } from '../shared/icons';

/** Light / dark-safe gradient pairs for icon discs (white glyph on top). */
export const HUES = {
  violet: ['#5B3DF0', '#8F6BFF'],
  teal: ['#0B8F84', '#2FCFBD'],
  pink: ['#C2185B', '#FF6FAE'],
  blue: ['#2F5FE0', '#5E9BFF'],
  amber: ['#C76A00', '#F5A524'],
  green: ['#12805A', '#34C98B'],
} as const satisfies Record<string, readonly [string, string]>;

export type HueName = keyof typeof HUES;

type CardProps = {
  children?: ReactNode;
  /** Dense fill for panels that sit on top of a photograph. */
  isStrong?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Frosted glass card with the Aurora defaults (blur + tinted fill + bright hairline + shadow). */
export function GlassCard({
  children,
  isStrong = false,
  radius = 26,
  style,
  contentStyle,
}: CardProps) {
  const p = usePaletteC();
  return (
    <Glass
      intensity={isStrong ? 30 : 45}
      tint={p.blurTint}
      fill={isStrong ? p.strong : p.glass}
      borderColor={p.edge}
      radius={radius}
      shadow={p.shadow}
      style={style}
      contentStyle={contentStyle}
    >
      {children}
    </Glass>
  );
}

type GradButtonProps = {
  label: string;
  icon?: IconName;
  iconFill?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  height?: number;
};

/** Primary call to action: brand-gradient pill with a soft violet glow, white label. */
export function GradButton({
  label,
  icon,
  iconFill,
  style,
  accessibilityLabel,
  height = 52,
}: GradButtonProps) {
  const p = usePaletteC();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        { borderRadius: height / 2, boxShadow: '0 8px 22px rgba(91,61,240,0.38)' },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <LinearGradient
        colors={[p.gradFrom, p.gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.grad, { minHeight: height, borderRadius: height / 2 }]}
      >
        {icon ? (
          <Icon name={icon} size={20} color="#FFFFFF" fill={iconFill ? '#FFFFFF' : undefined} />
        ) : null}
        <Text style={styles.gradLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  size?: number;
  color?: string;
  isFilled?: boolean;
  hasBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round glass button (48 dp default) for header / toolbar icons. */
export function GlassIconButton({
  icon,
  label,
  size = 48,
  color,
  isFilled,
  hasBadge,
  style,
}: IconButtonProps) {
  const p = usePaletteC();
  const tone = color ?? p.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={style}>
      <GlassCard
        radius={size / 2}
        contentStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon
          name={icon}
          size={Math.round(size * 0.46)}
          color={tone}
          fill={isFilled ? tone : undefined}
        />
      </GlassCard>
      {hasBadge ? <View style={[styles.badge, { backgroundColor: p.pinkText }]} /> : null}
    </Pressable>
  );
}

type OrbProps = { icon: IconName; hue: HueName; size?: number; iconFill?: string };

/** Gradient disc with a white glyph (category icons, AI orb, lesson numbers...). */
export function GradOrb({ icon, hue, size = 44, iconFill }: OrbProps) {
  return (
    <LinearGradient
      colors={HUES[hue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color="#FFFFFF" fill={iconFill} />
    </LinearGradient>
  );
}

type SectionProps = { title: string; action?: string; children: ReactNode; gap?: number };

export function Section({ title, action = 'Xem tất cả', children, gap = 30 }: SectionProps) {
  const p = usePaletteC();
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
          <T v="small" color="violetText">
            {action}
          </T>
          <Icon name="chevronRight" size={16} color={p.violetText} strokeWidth={2.4} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/**
 * Horizontal scroller for card rails. A scroller clips its children's shadows, so it is padded
 * (top 18 / bottom 44) and pulled back with negative margins: the shadows survive and the layout
 * spacing stays the same.
 */
export function Rail({ children, gap = 14 }: { children: ReactNode; gap?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.railScroll}
      contentContainerStyle={[styles.railContent, { gap }]}
    >
      {children}
    </ScrollView>
  );
}

type PillProps = { label: string; hue?: 'violet' | 'teal' | 'pink' | 'gold'; icon?: IconName };

/** Small tinted status pill ("Bán chạy", "96% phù hợp"...). Text colours are the AA text tones. */
export function Pill({ label, hue = 'violet', icon }: PillProps) {
  const p = usePaletteC();
  const tone = { violet: p.violetText, teal: p.tealText, pink: p.pinkText, gold: p.goldText }[hue];
  return (
    <View style={[styles.pill, { backgroundColor: p.chip, borderColor: p.hairline }]}>
      {icon ? <Icon name={icon} size={13} color={tone} strokeWidth={2.4} /> : null}
      <Text style={[styles.pillText, { color: tone }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  railScroll: { marginTop: -18, marginBottom: -26 },
  railContent: { paddingHorizontal: PAD, paddingTop: 18, paddingBottom: 44 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  grad: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradLabel: { fontFamily: FONT_C.bold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
  badge: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    marginBottom: 14,
  },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  pill: {
    alignSelf: 'flex-start',
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillText: { fontFamily: FONT_C.bold, fontSize: 12, lineHeight: 16 },
});
