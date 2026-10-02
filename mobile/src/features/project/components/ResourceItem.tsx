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
        <AppText variant="body" numberOfLines={1}>
          {resource.name}
        </AppText>
        <AppText variant="caption">{statusText}</AppText>
      </View>
      <Pressable
        onPress={() => onDownload(resource)}
        disabled={isDownloading || isDisabled}
        hitSlop={4}
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
          <Feather name="download" size={22} color={colors.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  doc: {
    width: 32,
    height: 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    borderRadius: radius.badge,
  },
  corner: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderBottomLeftRadius: radius.badge,
    borderTopRightRadius: radius.badge,
  },
  texts: { flex: 1 },
  download: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.4 },
});

export const ResourceItem = memo(ResourceItemBase);
