import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { Platform, Share, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type RecoveryCodesViewProps = {
  /** The 10 codes, `XXXXX-XXXXX`. Shown once: the server only keeps hashes. */
  codes: string[];
  /** Pressed after the user confirms they stored the codes. */
  onSaved: () => void;
  /** PC window: the explanation and buttons on the left, the codes on the right. */
  isSplit?: boolean;
};

/**
 * The recovery codes, shown ONCE after turning on 2FA (or after generating new ones): a warning,
 * the codes, copy / share, and an explicit "I've saved these codes" before the user can move on.
 */
export function RecoveryCodesView({ codes, onSaved, isSplit = false }: RecoveryCodesViewProps) {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const toast = useToast();
  const styles = useStyles();
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      toast.success(t('security.recovery.copied'));
    } catch {
      toast.error(t('security.recovery.copyFailed'));
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `${t('security.recovery.shareTitle')}\n${text}` });
    } catch {
      // The user dismissed the share sheet or sharing is unavailable: nothing to do.
    }
  };

  const warning = (
    <View style={styles.warning} accessibilityRole="alert">
      <Feather name="alert-triangle" size={18} color={colors.warning} />
      <AppText variant="body" style={styles.warningText}>
        {t('security.recovery.warning')}
      </AppText>
    </View>
  );
  const grid = (
    <View style={[styles.grid, isSplit ? styles.gridSplit : null]}>
      {codes.map((code) => (
        <View key={code} style={styles.codeCell}>
          <AppText variant="title" selectable style={styles.code} testID="recovery-code">
            {code}
          </AppText>
        </View>
      ))}
    </View>
  );
  const actions = (
    <View style={styles.actions}>
      <Button
        title={t('security.recovery.copy')}
        variant="secondary"
        size="sm"
        leftIcon="copy"
        onPress={() => void copy()}
        testID="recovery-copy"
      />
      {Platform.OS === 'web' ? null : (
        <Button
          title={t('security.recovery.share')}
          variant="secondary"
          size="sm"
          leftIcon="share-2"
          onPress={() => void share()}
          testID="recovery-share"
        />
      )}
    </View>
  );
  const saved = (
    <Button
      title={t('security.recovery.saved')}
      onPress={onSaved}
      fullWidth
      testID="recovery-saved"
    />
  );

  if (isSplit) {
    return (
      <View style={styles.split} testID="recovery-codes">
        <View style={styles.splitSide}>
          {warning}
          {actions}
          {saved}
        </View>
        {grid}
      </View>
    );
  }
  return (
    <View style={styles.container} testID="recovery-codes">
      {warning}
      {grid}
      {actions}
      {saved}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.lg },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  splitSide: { width: 300, flexShrink: 0, gap: spacing.lg },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: t.colors.warning,
    backgroundColor: t.colors.surfaceAlt,
  },
  warningText: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  gridSplit: { flex: 1, padding: spacing.xl },
  codeCell: { flexBasis: '45%', flexGrow: 1, paddingVertical: spacing.xs },
  code: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
}));
