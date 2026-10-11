import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { CourseModerationDto } from '@/types/api';

import { MODERATION_ICON } from '../statusMeta';

export type ModerationTimelineProps = { entries: readonly CourseModerationDto[] };

/** Review history, newest first: what happened, to the course or its revision, who and when. */
export function ModerationTimeline({ entries }: ModerationTimelineProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  if (entries.length === 0) {
    return <AppText variant="caption">{t('history.empty')}</AppText>;
  }
  return (
    <View style={styles.list} testID="moderation-timeline">
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={styles.dot}>
              <Feather name={MODERATION_ICON[entry.action]} size={14} color={colors.primaryText} />
            </View>
            {index < entries.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.text}>
            <AppText variant="body" family="bodyMedium">
              {t(`history.action.${entry.action}`, {
                target: t(`history.target.${entry.target}`),
              })}
            </AppText>
            <AppText variant="caption">
              {t('history.byOn', {
                name: entry.actor.fullName,
                date: formatDate(entry.createdAt, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </AppText>
            {entry.reason ? (
              <AppText variant="body" color="textSecondary">
                {t('history.reason', { reason: entry.reason })}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const DOT = 28;

const useStyles = makeStyles((t) => ({
  list: { gap: 0 },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: DOT },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  line: { flex: 1, width: 2, marginVertical: 2, backgroundColor: t.colors.border },
  text: { flex: 1, gap: spacing.xxs, paddingBottom: spacing.lg },
}));
