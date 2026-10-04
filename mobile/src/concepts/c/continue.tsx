import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard, GradButton, Rail, Section } from './parts';
import { T, usePaletteC } from './theme';
import { COURSES } from '../shared/mock';
import { Photo } from '../shared/Photo';
import { Ring } from '../shared/Ring';
import type { MockCourse } from '../shared/types';

type Item = { course: MockCourse; progress: number; meta: string };

const ITEMS: Item[] = [
  { course: COURSES.reactNative, progress: 0.68, meta: 'Bài 12 · còn 8 phút' },
  { course: COURSES.python, progress: 0.31, meta: 'Bài 15 · còn 12 phút' },
  { course: COURSES.video, progress: 0.12, meta: 'Bài 5 · còn 6 phút' },
];

function ContinueCard({ item, index }: { item: Item; index: number }) {
  const p = usePaletteC();
  const { course, progress, meta } = item;
  const percent = Math.round(progress * 100);
  return (
    <GlassCard radius={28} style={styles.card} contentStyle={styles.cardBody}>
      <Pressable
        accessible
        accessibilityLabel={`${course.title}, ${meta}, đã học ${percent}%`}
        style={styles.top}
      >
        <Ring
          size={72}
          strokeWidth={5}
          progress={progress}
          trackColor={p.track}
          colors={[p.glowTeal, p.glowViolet]}
          gradientId={`continueRing${index}`}
        >
          <View style={styles.thumb}>
            <Photo source={course.photo} width={200} placeholderColor={p.chip} />
          </View>
        </Ring>
        <View style={styles.flex}>
          <T v="h3" numberOfLines={2}>
            {course.title}
          </T>
          <T v="small" color="muted">
            {meta}
          </T>
        </View>
      </Pressable>
      <View style={styles.bottom}>
        <View style={styles.flex}>
          <T v="h2" color="tealText">
            {percent}%
          </T>
          <T v="tiny" color="muted">
            hoàn thành
          </T>
        </View>
        <GradButton
          label="Học tiếp"
          icon="play"
          iconFill
          height={48}
          accessibilityLabel={`Học tiếp ${course.title}`}
        />
      </View>
    </GlassCard>
  );
}

export function ContinueRail() {
  return (
    <Section title="Tiếp tục học" gap={28}>
      <Rail>
        {ITEMS.map((item, index) => (
          <ContinueCard key={item.course.id} item={item} index={index} />
        ))}
      </Rail>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  card: { width: 306 },
  cardBody: { padding: 16, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
