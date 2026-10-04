import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
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
  const { t } = useTranslation('project');
  const { colors } = useTheme();
  const styles = useStyles();
  const kind = getFileKind(name);
  // The neon `primary` fill is too pale on the light page for a small corner: use the accent text color.
  const cornerColor = kind.tone === 'primary' ? colors.primaryText : colors[kind.tone];
  return (
    <View style={styles.doc} importantForAccessibility="no">
      <View style={[styles.corner, { backgroundColor: cornerColor }]} />
      <AppText variant="micro" color="textSecondary">
        {kind.label || t('fileFallback')}
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
  const { t } = useTranslation('project');
  const { colors } = useTheme();
  const styles = useStyles();
  const sizeText = formatFileSize(resource.sizeBytes);
  const statusText = isDownloading
    ? percent != null
      ? t('downloadingPercent', { percent })
      : t('downloading')
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
        hitSlop={spacing.md}
        accessibilityRole="button"
        accessibilityLabel={
          isDownloading
            ? t('downloadingName', { name: resource.name })
            : t('download', { name: resource.name, size: sizeText })
        }
        accessibilityState={{ busy: isDownloading, disabled: isDownloading || isDisabled }}
        style={[styles.download, isDisabled && !isDownloading ? styles.dimmed : null]}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.primaryText} testID="resource-spinner" />
        ) : (
          <Feather name="download" size={24} color={colors.primaryText} />
        )}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  // 36 x 44 page icon: folded corner, the ".txt" label and three text lines.
  doc: {
    width: 36,
    height: 44,
    alignItems: 'center',
    paddingTop: spacing.md,
    borderWidth: 1.5,
    borderColor: t.colors.textSecondary,
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
  line: { width: 22, height: 1.5, backgroundColor: t.colors.iconMuted },
  texts: { flex: 1, gap: spacing.xxs },
  // 24 dp glyph; `hitSlop` (12) lifts the touch target to 48 dp.
  download: {
    width: layout.minTouchTarget / 2,
    height: layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.4 },
}));

export const ResourceItem = memo(ResourceItemBase);
