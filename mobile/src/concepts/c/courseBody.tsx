import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AI_SUMMARY } from './data';
import { GlassCard, GradOrb } from './parts';
import { PAD, T, usePaletteC } from './theme';
import { Icon } from '../shared/icons';
import { DETAIL } from '../shared/mock';

/** Segmented glass tabs; the active one is filled with the brand gradient. */
export function CourseTabs() {
  const p = usePaletteC();
  return (
    <GlassCard radius={28} style={styles.tabsWrap} contentStyle={styles.tabs}>
      <View style={styles.tabsRow} accessibilityRole="tablist">
        {DETAIL.tabs.map((tab, index) => {
          const isActive = index === 0;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={styles.tab}
            >
              {isActive ? (
                <LinearGradient
                  colors={[p.gradFrom, p.gradTo]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <T v="small" color={isActive ? 'white' : 'muted'} numberOfLines={1}>
                {tab}
              </T>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

export function Overview() {
  return (
    <View style={styles.block}>
      <T v="body" color="muted">
        {DETAIL.description}
      </T>
      <T v="h2" style={styles.h2}>
        Bạn sẽ học được
      </T>
      <GlassCard radius={26} contentStyle={styles.benefits}>
        {DETAIL.benefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <View style={styles.check}>
              <LinearGradient
                colors={['#0B8F84', '#2FCFBD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkFill}
              >
                <Icon name="check" size={15} color="#FFFFFF" strokeWidth={3.2} />
              </LinearGradient>
            </View>
            <View style={styles.flex}>
              <T v="body">{benefit}</T>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

/** "AI summary" card wearing the same aurora border as the Home AI card. */
export function AiSummary() {
  const p = usePaletteC();
  return (
    <View style={styles.aiWrap}>
      <LinearGradient
        colors={[p.glowTeal, p.glowViolet, p.glowPink]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiBorder}
      >
        <GlassCard isStrong radius={28} contentStyle={styles.aiBody}>
          <View style={styles.aiHead}>
            <GradOrb icon="sparkles" hue="violet" size={44} />
            <View style={styles.flex}>
              <T v="h2">AI tóm tắt khóa học</T>
              <T v="small" color="muted">
                Đọc nhanh trong 20 giây
              </T>
            </View>
          </View>
          {AI_SUMMARY.map((row) => (
            <View key={row.label} style={styles.aiRow}>
              <View style={[styles.aiIcon, { backgroundColor: p.chip }]}>
                <Icon name={row.icon} size={18} color={p.violetText} strokeWidth={2.3} />
              </View>
              <View style={styles.flex}>
                <T v="tiny" color="muted">
                  {row.label}
                </T>
                <T v="small" style={styles.aiText}>
                  {row.text}
                </T>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hỏi thêm AI Tutor về khóa học này"
            style={[styles.aiAsk, { backgroundColor: p.chip, borderColor: p.hairline }]}
          >
            <Icon name="message" size={18} color={p.violetText} strokeWidth={2.3} />
            <T v="small" color="violetText">
              Hỏi thêm AI Tutor
            </T>
          </Pressable>
        </GlassCard>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabsWrap: { marginHorizontal: PAD, marginTop: 22 },
  tabs: { padding: 5 },
  tabsRow: { flexDirection: 'row', gap: 2 },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { paddingHorizontal: PAD, marginTop: 22, gap: 14 },
  h2: { marginTop: 6 },
  benefits: { padding: 16, gap: 14 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', marginTop: 1 },
  checkFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aiWrap: { paddingHorizontal: PAD, marginTop: 26 },
  aiBorder: { borderRadius: 30, padding: 2, boxShadow: '0 12px 34px rgba(106,75,255,0.3)' },
  aiBody: { padding: 18, gap: 14 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiText: { lineHeight: 19 },
  aiAsk: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
