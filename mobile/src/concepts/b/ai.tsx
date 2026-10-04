import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FONT_B, PAD, T, usePaletteB } from './theme';
import { Icon } from '../shared/icons';
import { AI } from '../shared/mock';

/** Entry point for the upcoming AI tutor: suggestion + a prompt field + quick prompts. */
export function AiPanel() {
  const p = usePaletteB();
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.hairline }]}>
        <Svg width="100%" height="100%" style={styles.svgLayer}>
          <Defs>
            <RadialGradient id="aiViolet" cx="95%" cy="0%" rx="75%" ry="70%">
              <Stop offset="0" stopColor={p.glowViolet} stopOpacity={p.isDark ? 0.5 : 0.22} />
              <Stop offset="1" stopColor={p.glowViolet} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="aiNeon" cx="0%" cy="100%" rx="70%" ry="60%">
              <Stop offset="0" stopColor="#2EF2FF" stopOpacity={p.isDark ? 0.22 : 0.3} />
              <Stop offset="1" stopColor="#2EF2FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#aiViolet)" />
          <Rect width="100%" height="100%" fill="url(#aiNeon)" />
        </Svg>

        <View style={styles.head}>
          <View style={[styles.orb, { backgroundColor: p.neon }]}>
            <Icon name="sparkles" size={24} color={p.onNeon} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <T v="h2" style={styles.title}>
              AI Tutor
            </T>
            <T v="small" color="muted">
              Trợ giảng riêng, hiểu đúng chỗ bạn đang vướng
            </T>
          </View>
        </View>

        <T v="body" style={styles.suggest}>
          {AI.body}
        </T>

        <View style={[styles.input, { backgroundColor: p.surface2, borderColor: p.hairline }]}>
          <T v="small" color="muted" numberOfLines={1} style={styles.flex}>
            Hỏi về Bài 12: useEffect và cleanup...
          </T>
          <Icon name="mic" size={20} color={p.muted} />
          <View style={[styles.send, { backgroundColor: p.neon }]}>
            <Icon name="send" size={18} color={p.onNeon} strokeWidth={2.3} />
          </View>
        </View>

        <View style={styles.chips}>
          {AI.prompts.map((prompt) => (
            <View
              key={prompt}
              accessible
              accessibilityRole="button"
              accessibilityLabel={prompt}
              style={[styles.chip, { borderColor: p.hairline }]}
            >
              <T v="tiny" color="text">
                {prompt}
              </T>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svgLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  wrap: { paddingHorizontal: PAD, marginTop: 36 },
  card: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 14, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orb: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontFamily: FONT_B.serifItalic },
  suggest: { lineHeight: 23 },
  input: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
