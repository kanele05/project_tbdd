import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard, GradOrb } from './parts';
import { PAD, T, usePaletteC } from './theme';
import { Icon } from '../shared/icons';
import { AI } from '../shared/mock';

/**
 * AI Tutor entry point: the card wears a thin aurora-gradient border (the "AI glow"), holds the
 * suggestion, a prompt field and quick prompts.
 */
export function AiCard() {
  const p = usePaletteC();
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[p.glowTeal, p.glowViolet, p.glowPink]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <GlassCard isStrong radius={28} style={styles.inner} contentStyle={styles.body}>
          <View style={styles.head}>
            <GradOrb icon="sparkles" hue="violet" size={48} />
            <View style={styles.flex}>
              <T v="h2">AI Tutor</T>
              <T v="small" color="muted">
                Trợ giảng riêng, hiểu đúng chỗ bạn đang vướng
              </T>
            </View>
          </View>

          <T v="body">{AI.body}</T>

          <View style={[styles.input, { backgroundColor: p.chip, borderColor: p.hairline }]}>
            <T v="small" color="muted" numberOfLines={1} style={styles.flex}>
              Hỏi về Bài 12: useEffect và cleanup...
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhập bằng giọng nói"
              style={styles.mic}
            >
              <Icon name="mic" size={20} color={p.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi câu hỏi cho AI Tutor"
              hitSlop={4}
            >
              <GradOrb icon="send" hue="violet" size={44} />
            </Pressable>
          </View>

          <View style={styles.chips}>
            {AI.prompts.map((prompt) => (
              <Pressable
                key={prompt}
                accessibilityRole="button"
                accessibilityLabel={prompt}
                style={[styles.chip, { backgroundColor: p.chip, borderColor: p.hairline }]}
              >
                <T v="tiny" color="violetText">
                  {prompt}
                </T>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { paddingHorizontal: PAD, marginTop: 34 },
  border: { borderRadius: 30, padding: 2, boxShadow: '0 12px 34px rgba(106,75,255,0.3)' },
  inner: { borderRadius: 28 },
  body: { padding: 18, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mic: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
