import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import type { ResourceDto } from '@/types/api';

import { formatFileSize, getFileKind } from '../fileUtils';

export type ResourceItemProps = {
  resource: ResourceDto;
  /** True while this resource is being downloaded; `percent` is null until the size is known. */
  isDownloading: boolean;
  percent?: number | null;
  /** Disables the button while another resource is downloading. */
  isDisabled?: boolean;
  /** Keep stable (`useCallback`) so `React.memo` works. */
  onDownload: (resource: ResourceDto) => void;
};

function FileTypeIcon({ name }: { name: string }) {
  const kind = getFileKind(name);
  return (
    <View style={styles.doc} importantForAccessibility="no">
      <View style={[styles.corner, { backgroundColor: colors[kind.tone] }]} />
      <AppText variant="micro" color="textSecondary">
        {kind.label}
      </AppText>
      <View style={styles.lines}>
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </View>
    </View>
  );
}

/** A downloadable resource row: type icon, name, size and the download button. */
function ResourceItemBase({
  resource,
  isDownloading,
  percent,
  isDisabled = false,
  onDownload,
}: ResourceItemProps) {
  const sizeText = formatFileSize(resource.sizeBytes);
  const statusText = isDownloading
    ? `Downloading${percent != null ? ` ${percent}%` : '...'}`
    : sizeText;

  return (
    <View style={styles.card}>
      <FileTypeIcon name={resource.name} />
      <View style={styles.texts}>
        <AppText variant="body" numberOfLines={1} style={styles.line22}>
          {resource.name}
        </AppText>
        <AppText variant="body" color="textMuted" style={styles.line22}>
          {statusText}
        </AppText>
      </View>
      <Pressable
        onPress={() => onDownload(resource)}
        disabled={isDownloading || isDisabled}
        hitSlop={spacing.md}
        accessibilityRole="button"
        accessibilityLabel={
          isDownloading ? `Downloading ${resource.name}` : `Download ${resource.name}, ${sizeText}`
        }
        accessibilityState={{ busy: isDownloading, disabled: isDownloading || isDisabled }}
        style={[styles.download, isDisabled && !isDownloading ? styles.dimmed : null]}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.primary} testID="resource-spinner" />
        ) : (
          <Feather name="download" size={24} color={colors.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm + spacing.xxs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  // Design: 36 x 44 page icon - folded corner, ".txt" label and three text lines.
  doc: {
    width: 36,
    height: 44,
    alignItems: 'center',
    paddingTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    borderRadius: radius.button,
  },
  corner: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderBottomLeftRadius: radius.badge,
    borderTopRightRadius: radius.button,
  },
  lines: { marginTop: spacing.xs, gap: spacing.xxs + 1 },
  line: { width: 22, height: 1.5, backgroundColor: colors.iconMuted },
  texts: { flex: 1 },
  // Design: both text lines are 14 dp with a 22 dp pitch.
  line22: { lineHeight: 22 },
  // 24 dp glyph; `hitSlop` (12) lifts the touch target to 48 dp.
  download: {
    width: layout.minTouchTarget / 2,
    height: layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.4 },
});

export const ResourceItem = memo(ResourceItemBase);
