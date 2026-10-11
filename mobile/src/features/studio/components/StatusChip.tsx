import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseStatus, RevisionStatus } from '@/types/api';

import { COURSE_STATUS_TONE, REVISION_STATUS_TONE } from '../statusMeta';

export type StatusChipProps = { status: CourseStatus } | { revision: RevisionStatus };

/**
 * Pill with an icon and the status name. Draft is a neutral outline, pending review gold,
 * published green, rejected red and hidden violet; the text color is the matching `onXxx` token so
 * contrast holds in light and dark. The icon keeps the status readable without color.
 */
function StatusChipBase(props: StatusChipProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const tone =
    'status' in props ? COURSE_STATUS_TONE[props.status] : REVISION_STATUS_TONE[props.revision];
  const label = t(`status.${tone.labelKey}`);
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors[tone.background], borderColor: colors[tone.border] },
      ]}
      accessibilityLabel={label}
      testID={'status' in props ? `status-chip-${props.status}` : `revision-chip-${props.revision}`}
    >
      <Feather name={tone.icon} size={12} color={colors[tone.text]} />
      <AppText
        variant="micro"
        family="bodySemiBold"
        style={{ color: colors[tone.text] }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
}));

export const StatusChip = memo(StatusChipBase);
