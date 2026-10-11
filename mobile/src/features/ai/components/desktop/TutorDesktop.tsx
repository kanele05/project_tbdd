import type { ReactNode } from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { WorkFrame, WorkHeader } from '@/components/layout/work';
import { IconButton } from '@/components/ui/IconButton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

export const TUTOR_PAGE_WIDTH = 1120;
const SIDE_WIDTH = 300;

export type TutorDesktopProps = {
  courseTitle?: string;
  /** The message list, the empty state or an error: fills the card above the composer. */
  body: ReactNode;
  composer: ReactNode;
  onClear: () => void;
  isClearDisabled: boolean;
  /** Course + quick questions; shown to the right of the chat on a desktop window. */
  side: ReactNode;
};

/**
 * AI Tutor on a PC window (PLAN §2.5): a title row, then a centered chat card (about 800 dp, the
 * message list scrolls and the composer stays pinned at the bottom of the card) with the course
 * and quick questions in a column on its right. On a tablet the side column is left out.
 */
export function TutorDesktop({
  courseTitle,
  body,
  composer,
  onClear,
  isClearDisabled,
  side,
}: TutorDesktopProps) {
  const { t } = useTranslation('ai');
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  return (
    <WorkFrame testID="tutor-desktop">
      <PageContainer maxWidth={TUTOR_PAGE_WIDTH} style={styles.page}>
        <WorkHeader
          hasBack
          title={t('tutor.headerTitle')}
          subtitle={courseTitle}
          right={
            <IconButton
              icon="trash-2"
              onPress={onClear}
              disabled={isClearDisabled}
              accessibilityLabel={t('tutor.clear')}
              color="textSecondary"
            />
          }
        />
        <View style={styles.row}>
          <View style={styles.chat} testID="tutor-chat-card">
            <View style={styles.body}>{body}</View>
            {composer}
          </View>
          {isDesktop ? (
            <View style={styles.side} testID="tutor-side">
              {side}
            </View>
          ) : null}
        </View>
      </PageContainer>
    </WorkFrame>
  );
}

const useStyles = makeStyles((t) => ({
  page: { flex: 1, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  row: { flex: 1, flexDirection: 'row', gap: spacing.xl, minHeight: 0 },
  // The card clips its children, so the composer's top hairline reaches the rounded border.
  chat: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  body: { flex: 1, minHeight: 0 },
  side: { width: SIDE_WIDTH, flexShrink: 0, gap: spacing.lg },
}));
