import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard, GradOrb, HUES, Rail, Section, type HueName } from './parts';
import { PAD, T, usePaletteC } from './theme';
import { formatCount, formatRating } from '../shared/format';
import { Icon } from '../shared/icons';
import { CATEGORIES, TEACHERS } from '../shared/mock';
import { Photo } from '../shared/Photo';
import type { MockTeacher } from '../shared/types';

const CATEGORY_HUE: HueName[] = ['violet', 'pink', 'amber', 'blue', 'teal', 'green'];

export function Categories() {
  return (
    <Section title="Danh mục" gap={32}>
      <View style={styles.grid}>
        {CATEGORIES.map((category, index) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}, ${category.count} khóa học`}
            style={styles.tile}
          >
            <GlassCard radius={26} contentStyle={styles.tileBody}>
              <GradOrb
                icon={category.icon}
                hue={CATEGORY_HUE[index % CATEGORY_HUE.length] ?? 'violet'}
              />
              <View>
                <T v="h3" numberOfLines={1} style={styles.tileName}>
                  {category.name}
                </T>
                <T v="tiny" color="muted">
                  {category.count} khóa
                </T>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

function TeacherCard({ teacher, hue }: { teacher: MockTeacher; hue: HueName }) {
  const p = usePaletteC();
  return (
    <Pressable
      accessible
      accessibilityLabel={`${teacher.name}, ${teacher.field}, ${formatCount(teacher.students)} học viên`}
    >
      <GlassCard radius={28} style={styles.teacher} contentStyle={styles.teacherBody}>
        <LinearGradient
          colors={HUES[hue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatar, { borderColor: p.bgSolid }]}>
            <Photo source={teacher.avatar} width={200} placeholderColor={p.chip} position="top" />
          </View>
        </LinearGradient>
        <T v="h3" align="center" numberOfLines={2} style={styles.teacherName}>
          {teacher.name}
        </T>
        <T v="tiny" color="muted" align="center" numberOfLines={1}>
          {teacher.field}
        </T>
        <View style={styles.row}>
          <Icon name="star" size={13} color={p.gold} fill={p.gold} strokeWidth={1.5} />
          <T v="small" color="goldText">
            {formatRating(teacher.rating)}
          </T>
          <T v="small" color="muted">
            · {teacher.courses} khóa
          </T>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export function TeacherRail() {
  return (
    <Section title="Giảng viên hàng đầu">
      <Rail gap={12}>
        {TEACHERS.map((teacher, index) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            hue={CATEGORY_HUE[(index + 2) % CATEGORY_HUE.length] ?? 'violet'}
          />
        ))}
      </Rail>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { paddingHorizontal: PAD, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '30%' },
  tileName: { fontSize: 14 },
  tileBody: { padding: 12, gap: 12 },
  teacher: { width: 156 },
  teacherBody: { padding: 14, alignItems: 'center', gap: 4 },
  avatarRing: { width: 84, height: 84, borderRadius: 42, padding: 3, marginBottom: 6 },
  avatar: { flex: 1, borderRadius: 39, borderWidth: 2, overflow: 'hidden' },
  teacherName: { minHeight: 42 },
});
