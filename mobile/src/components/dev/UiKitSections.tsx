import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardHorizontal } from '@/components/course/CourseCardHorizontal';
import {
  CourseCardHorizontalSkeleton,
  CourseCardVerticalSkeleton,
} from '@/components/course/CourseCardSkeleton';
import { CourseCardVertical } from '@/components/course/CourseCardVertical';
import { PriceTag } from '@/components/course/PriceTag';
import { AiCard } from '@/components/ui/AiCard';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RailList } from '@/components/ui/RailList';
import { RatingInline } from '@/components/ui/RatingInline';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StarRating } from '@/components/ui/StarRating';
import { TextField } from '@/components/ui/TextField';
import { AppError } from '@/lib/appError';
import { layout, makeStyles, radius, spacing, type TextVariant } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { PHOTOS, type PreviewCopy } from './uiKitSamples';

const noop = (): void => undefined;

export function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <AppText variant="caption" family="bodyBold" color="primaryText" uppercase>
        {title}
      </AppText>
      {children}
    </View>
  );
}

const TYPE_ROWS: readonly { variant: TextVariant; key: keyof PreviewCopy['typeSamples'] }[] = [
  { variant: 'hero', key: 'hero' },
  { variant: 'h1', key: 'h1' },
  { variant: 'h2', key: 'h2' },
  { variant: 'h3', key: 'h3' },
  { variant: 'title', key: 'title' },
  { variant: 'body', key: 'body' },
  { variant: 'caption', key: 'caption' },
];

export function TypographySection({ copy }: { copy: PreviewCopy }) {
  return (
    <PreviewSection title={copy.sections.typography}>
      {TYPE_ROWS.map(({ variant, key }) => (
        <AppText key={variant} variant={variant}>
          {copy.typeSamples[key]}
        </AppText>
      ))}
    </PreviewSection>
  );
}

export function ButtonsSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  return (
    <PreviewSection title={copy.sections.buttons}>
      <Button title={copy.heroCta} leftIcon="play" fullWidth />
      <View style={styles.row}>
        <Button title="Secondary" variant="secondary" />
        <Button title="Outline" variant="outline" />
        <Button title="Ghost" variant="ghost" />
      </View>
      <View style={styles.row}>
        <Button title="Small" size="sm" />
        <Button title="Loading" loading />
        <Button title="Disabled" disabled />
      </View>
    </PreviewSection>
  );
}

export function ChipsSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  const [selected, setSelected] = useState(0);
  return (
    <PreviewSection title={copy.sections.chips}>
      <View style={styles.rowWrap}>
        {copy.topics.map((topic, index) => (
          <Chip
            key={topic}
            label={topic}
            selected={index === selected}
            leftIcon={index === 0 ? 'code' : undefined}
            onPress={() => setSelected(index)}
          />
        ))}
      </View>
      <View style={styles.rowWrap}>
        <Chip label="Filled" variant="filled" size="sm" />
        <Chip label="Outline sm" size="sm" />
        <Chip label="Selected sm" size="sm" selected />
      </View>
    </PreviewSection>
  );
}

export function TabsAndFieldsSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  const [tab, setTab] = useState('0');
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('khang@');
  return (
    <>
      <PreviewSection title={copy.sections.tabs}>
        <SegmentedTabs
          tabs={copy.tabs.map((label, index) => ({ key: String(index), label }))}
          value={tab}
          onChange={setTab}
        />
      </PreviewSection>
      <PreviewSection title={copy.sections.fields}>
        <SearchBar value={query} onChangeText={setQuery} />
        <TextField
          label={copy.email}
          leftIcon="mail"
          value={email}
          onChangeText={setEmail}
          error={copy.emailError}
        />
        <TextField label={copy.password} leftIcon="lock" secureTextEntry value="secret" />
        <View style={styles.row} />
      </PreviewSection>
    </>
  );
}

export function SmallPartsSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  return (
    <PreviewSection title={copy.sections.small}>
      <View style={styles.rowWrap}>
        <Badge label="Best-seller" tone="gold" />
        <Badge label="-40%" tone="gold" />
        <Badge label="Teacher" tone="primary" shape="pill" />
        <Badge label="Top-rated" tone="secondary" shape="pill" />
        <Badge count={3} />
        <Badge count={120} />
      </View>
      <View style={styles.rowCenter}>
        <Avatar name="Khang Le" size={48} />
        <Avatar name="Thu Ha" size={48} hasRing />
        <Avatar uri={PHOTOS.talk} name="Photo" size={48} hasRing />
        <View style={styles.flex}>
          <ProgressBar percent={68} />
          <View style={styles.gap} />
          <ProgressBar percent={31} height={6} />
        </View>
      </View>
      <View style={styles.rowCenter}>
        <StarRating value={4} size={20} />
        <RatingInline rating={4.8} count={2340} lessonCount={42} />
      </View>
      <View style={styles.rowCenter}>
        <PriceTag priceCents={4999} originalPriceCents={8999} />
        <PriceTag
          priceCents={4999}
          originalPriceCents={8999}
          layout="stacked"
          discountPercent={44}
        />
        <PriceTag priceCents={0} />
      </View>
    </PreviewSection>
  );
}

export function CardsSection({
  copy,
  courses,
}: {
  copy: PreviewCopy;
  courses: readonly CourseSummary[];
}) {
  const styles = useStyles();
  return (
    <PreviewSection title={copy.sections.cards}>
      {courses.slice(0, 2).map((course) => (
        <CourseCardHorizontal
          key={course.id}
          course={course}
          onPress={noop}
          onToggleBookmark={noop}
        />
      ))}
      <CourseCardHorizontalSkeleton />
      <View style={styles.gap} />
    </PreviewSection>
  );
}

export function AiSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  return (
    <PreviewSection title={copy.sections.ai}>
      <AiCard title={copy.aiTitle} subtitle={copy.aiSubtitle}>
        <AppText variant="body">{copy.aiBody}</AppText>
        <View style={styles.aiInput}>
          <AppText variant="caption" numberOfLines={1}>
            {copy.aiPlaceholder}
          </AppText>
        </View>
        <View style={styles.rowWrap}>
          {copy.aiPrompts.map((prompt) => (
            <Chip key={prompt} label={prompt} size="sm" onPress={noop} />
          ))}
        </View>
      </AiCard>
      <AiCard variant="row" title={copy.aiRowTitle} subtitle={copy.aiRowSubtitle} onPress={noop} />
    </PreviewSection>
  );
}

export function StatesSection({ copy }: { copy: PreviewCopy }) {
  return (
    <PreviewSection title={copy.sections.states}>
      <EmptyState
        title={copy.emptyTitle}
        message={copy.emptyMessage}
        actionLabel={copy.emptyAction}
        onAction={noop}
        icon="book-open"
      />
      <ErrorState
        error={new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' })}
        onRetry={noop}
      />
    </PreviewSection>
  );
}

export function RailSection({
  copy,
  courses,
}: {
  copy: PreviewCopy;
  courses: readonly CourseSummary[];
}) {
  return (
    <View style={railStyles.wrap}>
      <RailList
        title={copy.railTitle}
        onViewMore={noop}
        data={courses}
        keyExtractor={(course) => course.id}
        renderItem={(course) => (
          <CourseCardVertical course={course} onPress={noop} onToggleBookmark={noop} />
        )}
      />
      <RailList
        data={[1, 2, 3]}
        keyExtractor={(item) => String(item)}
        renderItem={() => <CourseCardVerticalSkeleton />}
        style={railStyles.skeleton}
      />
    </View>
  );
}

/** Glass over a photo: shows what the frosted surfaces look like when content is behind them. */
export function GlassSection({ copy }: { copy: PreviewCopy }) {
  const styles = useStyles();
  return (
    <PreviewSection title={copy.sections.glass}>
      <View style={styles.photo}>
        <Image source={{ uri: PHOTOS.design }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.photoTop}>
          <GlassIconButton icon="chevron-left" accessibilityLabel="Back" />
          <GlassIconButton icon="heart" accessibilityLabel="Like" isActive />
        </View>
        <GlassSurface radius={radius.xl} style={styles.photoGlass} contentStyle={styles.glassPad}>
          <AppText variant="label">{copy.glassCaption}</AppText>
          <AppText variant="caption" color="textSecondary">
            {copy.sections.glass}
          </AppText>
        </GlassSurface>
      </View>
    </PreviewSection>
  );
}

const railStyles = StyleSheet.create({
  wrap: { marginHorizontal: -layout.screenPaddingX, gap: spacing.lg },
  skeleton: { marginTop: spacing.sm },
});

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  flex: { flex: 1 },
  gap: { height: spacing.sm },
  aiInput: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  photo: {
    height: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    backgroundColor: t.colors.surface,
  },
  photoTop: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoGlass: { alignSelf: 'stretch' },
  glassPad: { padding: spacing.lg, gap: spacing.xs },
}));
